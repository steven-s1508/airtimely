-- =====================================================================================
-- Clean old days without a published schedule (2026-09-19)
--
-- Old poller data (up to 2026-09-13) on days without any OPERATING schedule entry was
-- only cleared where the ride had op = 0, because park hours were unknown. Analysis on
-- 2026-09-19: 49,617 such ride-days at 62 parks, 33,069 of them with only 0-minute waits
-- (closed days reported as "operating") — e.g. Plopsaland off-season weekdays.
--
-- New rule for these days, applied only from the park's first schedule date onwards
-- (before that, "no schedule" means unknown and the day is left as it is):
--   1. Hours outside the park's usual opening window are cleared. The window runs from
--      the earliest opening to the latest closing time of day found in the park's own
--      OPERATING schedule history (e.g. 10:00–22:30).
--   2. If no wait above 0 remains, the whole day is cleared (closed day).
-- Days with a schedule behave exactly as in patch 05.
--
-- Requires patch 05. Apply: run the whole file (STEP 1 creates the functions in one
-- transaction), then run STEP 2 month by month from a shell, then the STEP 3 check.
-- =====================================================================================


-- STEP 1 — Functions
begin;

create or replace function public.clear_non_operating_hours(p_ride_id uuid, p_date date, p_hourly jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
    v_park_id     uuid;
    v_tz          text;
    v_day         tstzrange;
    v_windows     tstzrange[];
    v_inferred    boolean := false;
    v_first_date  date;
    v_open_min    numeric;
    v_close_min   numeric;
    v_result      jsonb;
begin
    select r.park_id, coalesce(p.timezone, 'UTC')
      into v_park_id, v_tz
      from rides r
      join parks p on p.id = r.park_id
     where r.id = p_ride_id;

    if v_park_id is null or p_hourly is null then
        return p_hourly;
    end if;

    v_day := tstzrange(p_date::timestamp at time zone v_tz, (p_date + 1)::timestamp at time zone v_tz);

    select array_agg(tstzrange(ps.opening_time::timestamptz, ps.closing_time::timestamptz) * v_day)
      into v_windows
      from parks_schedule ps
     where ps.park_id = v_park_id
       and ps.type = 'OPERATING'
       and ps.date between p_date - 1 and p_date
       and ps.opening_time is not null
       and ps.closing_time is not null
       and ps.opening_time::timestamptz < ps.closing_time::timestamptz
       and tstzrange(ps.opening_time::timestamptz, ps.closing_time::timestamptz) && v_day;

    -- No schedule for this day: once the park's schedule sync was active, a missing entry
    -- means the park published no hours (usually closed). Use its usual opening window.
    if v_windows is null then
        select min(ps.date) into v_first_date from parks_schedule ps where ps.park_id = v_park_id;

        if v_first_date is not null and p_date >= v_first_date then
            -- Minutes after local midnight of the schedule date (closing can exceed 1440)
            select min(extract(epoch from (ps.opening_time::timestamptz at time zone v_tz) - ps.date::timestamp) / 60),
                   max(extract(epoch from (ps.closing_time::timestamptz at time zone v_tz) - ps.date::timestamp) / 60)
              into v_open_min, v_close_min
              from parks_schedule ps
             where ps.park_id = v_park_id
               and ps.type = 'OPERATING'
               and ps.opening_time is not null
               and ps.closing_time is not null
               and ps.opening_time::timestamptz < ps.closing_time::timestamptz;

            if v_open_min is not null then
                v_windows := array[
                    tstzrange((p_date + make_interval(mins => greatest(0, v_open_min)::int)) at time zone v_tz,
                              (p_date + make_interval(mins => least(2880, v_close_min)::int)) at time zone v_tz)
                    * v_day
                ];
                v_inferred := true;
            end if;
        end if;
    end if;

    select jsonb_agg(
               case when coalesce((e->>'op')::numeric, 0) > 0
                         and (v_windows is null or exists (select 1 from unnest(v_windows) w where w && hr))
                    then e
                    else e || jsonb_build_object('avg', null, 'avg_s', null, 'min', null, 'max', null, 'op', 0)
               end
               order by (e->>'h')::int)
      into v_result
      from (select e,
                   tstzrange((p_date + make_interval(hours => (e->>'h')::int)) at time zone v_tz,
                             (p_date + make_interval(hours => (e->>'h')::int + 1)) at time zone v_tz) as hr
              from jsonb_array_elements(p_hourly) e) x;

    -- Inferred window and no real wait left: the park was closed that day
    if v_inferred and not exists (select 1 from jsonb_array_elements(v_result) e
                                   where coalesce((e->>'avg')::numeric, 0) > 0) then
        select jsonb_agg(e || jsonb_build_object('avg', null, 'avg_s', null, 'min', null, 'max', null, 'op', 0)
                         order by (e->>'h')::int)
          into v_result
          from jsonb_array_elements(v_result) e;
    end if;

    return v_result;
end;
$$;


-- Re-cleans and recomputes only old days without an OPERATING schedule entry, for one
-- date range per call (keep ranges small: each call is one transaction)
drop function if exists public.recompute_days_without_schedule(date);

create or replace function public.recompute_days_without_schedule(p_from date, p_to date)
returns integer
language plpgsql
as $$
declare
    r       record;
    v_count integer := 0;
begin
    for r in
        select d.ride_id, d.date, d.hourly_data
          from daily_ride_statistics d
          join rides ri on ri.id = d.ride_id
         where d.date between p_from and p_to
           and d.hourly_data is not null
           -- No entry of its own. (A previous-day entry must not exclude the day: it usually
           -- ends before midnight; clear_non_operating_hours still uses it if it overlaps.)
           and not exists (select 1 from parks_schedule ps
                            where ps.park_id = ri.park_id
                              and ps.type = 'OPERATING'
                              and ps.date = d.date)
    loop
        perform upsert_daily_from_hourly_json(r.ride_id, r.date,
                                              clear_non_operating_hours(r.ride_id, r.date, r.hourly_data));
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$$;

revoke all on function public.clear_non_operating_hours(uuid, date, jsonb)     from public, anon, authenticated;
revoke all on function public.recompute_days_without_schedule(date, date)      from public, anon, authenticated;
grant execute on function public.clear_non_operating_hours(uuid, date, jsonb)  to service_role;
grant execute on function public.recompute_days_without_schedule(date, date)   to service_role;

commit;


-- STEP 2 — Clean + recompute the affected days, one month per call (run from a shell):
--   DB=supabase-db-zg44g0o848cckggcs4gwos4c
--   for m in $(seq 0 15); do
--     from=$(date -d "2025-06-01 +$m month" +%F); to=$(date -d "$from +1 month -1 day" +%F)
--     [ "$to" > "2026-09-13" ] && to=2026-09-13
--     echo -n "$from → $to: "; docker exec $DB psql -U postgres -d postgres -Atc "select recompute_days_without_schedule('$from', '$to');"
--   done


-- STEP 3 — Check (read-only): same query as before; all_zero_days should now be 0
-- (those days have no average any more) and days_with_waits roughly unchanged
with first_sched as (select park_id, min(date) as first_date from parks_schedule group by park_id),
d as (
    select d.date, d.avg_wait_time_minutes, r.park_id
      from daily_ride_statistics d
      join rides r on r.id = d.ride_id
      join first_sched f on f.park_id = r.park_id and d.date >= f.first_date
     where d.date <= '2026-09-13'
       and d.avg_wait_time_minutes is not null
       and not exists (select 1 from parks_schedule ps
                        where ps.park_id = r.park_id and ps.type = 'OPERATING'
                          and ps.date = d.date)
)
select count(*)                                           as ride_days_without_schedule,
       count(*) filter (where avg_wait_time_minutes = 0)  as all_zero_days,
       count(*) filter (where avg_wait_time_minutes > 0)  as days_with_waits,
       count(distinct park_id)                            as parks
  from d;
