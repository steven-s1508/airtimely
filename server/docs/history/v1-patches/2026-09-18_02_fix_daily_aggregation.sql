-- =====================================================================================
-- Fix daily aggregation (2026-09-18)
--
-- Bug fixed: aggregate_daily_from_hourly compared park-local hours against opening
-- hours after shifting them by the park's UTC offset, so the "inside park hours"
-- filter selected the wrong hours (e.g. only 12–23 for a New York park open 08–23).
-- Every daily avg/median/peak/operational%/downtime outside UTC was affected.
--
-- What this patch does:
--   1. upsert_daily_from_hourly_json(): the single place that turns a day's hourly
--      array (the `hourly_data` JSONB format) into a daily_ride_statistics row.
--      Used by the live pipeline AND by the historical recompute (patch 03).
--   2. aggregate_daily_from_hourly(): same signature as before, now delegates to (1).
--   3. aggregate_daily_for_park(): aggregates every ride of one park for one date in
--      a single call (used by the history backfill script).
--
-- Semantics of the corrected daily figures:
--   - Park hours = OPERATING windows from parks_schedule that overlap the park-local
--     day (windows from the previous date that run past midnight are included).
--   - An hour counts toward the day if it overlaps park hours (partial hours count,
--     with their operating minutes clipped to the overlap).
--   - No schedule for the day: hours in which the ride operated count;
--     operational_percentage and downtime_minutes are NULL (unknown), not guessed.
--   - avg_wait is weighted by operating minutes per hour.
--   - No operating data: stats are NULL instead of 0, so closed days no longer drag
--     averages down.
--
-- Assumes the session TimeZone is UTC (Supabase default), as the existing
-- recorded_at_local convention already does.
--
-- Apply: run this whole file once (it is transaction-safe).
-- Check the existing default of p_cleanup first and keep it if it differs:
--   select pg_get_functiondef('public.aggregate_daily_from_hourly'::regproc);
-- =====================================================================================

begin;

create or replace function public.upsert_daily_from_hourly_json(p_ride_id uuid, p_date date, p_hourly jsonb)
returns void
language plpgsql
as $$
declare
    v_park_id   uuid;
    v_tz        text;
    v_day       tstzrange;
    v_windows   tstzrange[];
    v_sched_min numeric;
    v_has_sched boolean;
    s           record;
begin
    select r.park_id, coalesce(p.timezone, 'UTC')
      into v_park_id, v_tz
      from rides r
      join parks p on p.id = r.park_id
     where r.id = p_ride_id;

    if v_park_id is null then
        raise notice 'Ride % not found', p_ride_id;
        return;
    end if;

    -- The park-local calendar day as real instants
    v_day := tstzrange(p_date::timestamp at time zone v_tz, (p_date + 1)::timestamp at time zone v_tz);

    -- Official operating windows overlapping that day, clipped to it
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

    v_has_sched := v_windows is not null;
    select coalesce(sum(extract(epoch from upper(w) - lower(w)) / 60), 0)
      into v_sched_min
      from unnest(v_windows) w;

    with hrs as (
        select (e->>'h')::int                   as h,
               (e->>'avg')::numeric             as avg_w,
               (e->>'avg_s')::numeric           as avg_s,
               (e->>'min')::int                 as min_w,
               (e->>'max')::int                 as max_w,
               coalesce((e->>'op')::numeric, 0) as op,
               coalesce((e->>'data')::int, 0)   as pts,
               tstzrange((p_date + make_interval(hours => (e->>'h')::int)) at time zone v_tz,
                         (p_date + make_interval(hours => (e->>'h')::int + 1)) at time zone v_tz) as hr
          from jsonb_array_elements(coalesce(p_hourly, '[]'::jsonb)) e
    ), scored as (
        select hrs.*,
               (select coalesce(sum(extract(epoch from upper(w * hrs.hr) - lower(w * hrs.hr)) / 60), 0)
                  from unnest(v_windows) w
                 where not isempty(w * hrs.hr)) as sched
          from hrs
    ), in_hours as (
        select scored.*,
               least(op, case when v_has_sched then sched else 60 end) as op_in
          from scored
         where case when v_has_sched then sched > 0 else op > 0 end
    )
    select round(coalesce(
                     sum(avg_w * op_in) filter (where avg_w is not null)
                         / nullif(sum(op_in) filter (where avg_w is not null), 0),
                     avg(avg_w)), 2)                                               as avg_wait,
           min(min_w)                                                             as min_wait,
           max(max_w)                                                             as max_wait,
           round((percentile_cont(0.5) within group (order by avg_w))::numeric, 2) as median_wait,
           round(avg(avg_s), 2)                                                   as avg_single,
           round(min(avg_s))::int                                                 as min_single,
           round(max(avg_s))::int                                                 as max_single,
           coalesce(sum(pts), 0)::int                                             as total_points,
           coalesce(sum(op_in), 0)                                                as op_minutes,
           (array_agg(h order by avg_w desc, max_w desc) filter (where avg_w is not null))[1]     as peak_hour,
           (array_agg(max_w order by avg_w desc, max_w desc) filter (where avg_w is not null))[1] as peak_value,
           (array_agg(h order by avg_w asc, min_w asc) filter (where avg_w is not null))[1]       as low_hour
      into s
      from in_hours;

    insert into daily_ride_statistics (
        ride_id, date, avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        median_wait_time_minutes, avg_single_rider_wait_minutes, min_single_rider_wait_minutes,
        max_single_rider_wait_minutes, total_data_points, operational_percentage, downtime_minutes,
        peak_wait_time_hour, peak_wait_time_value, lowest_wait_time_hour, hourly_data
    )
    values (
        p_ride_id, p_date, s.avg_wait, s.min_wait, s.max_wait,
        s.median_wait, s.avg_single, s.min_single,
        s.max_single, s.total_points,
        case when v_has_sched and v_sched_min > 0
             then least(100, round(s.op_minutes * 100 / v_sched_min, 2)) end,
        case when v_has_sched
             then greatest(0, round(v_sched_min - s.op_minutes))::int end,
        s.peak_hour, s.peak_value, s.low_hour, p_hourly
    )
    on conflict (ride_id, date) do update set
        avg_wait_time_minutes         = excluded.avg_wait_time_minutes,
        min_wait_time_minutes         = excluded.min_wait_time_minutes,
        max_wait_time_minutes         = excluded.max_wait_time_minutes,
        median_wait_time_minutes      = excluded.median_wait_time_minutes,
        avg_single_rider_wait_minutes = excluded.avg_single_rider_wait_minutes,
        min_single_rider_wait_minutes = excluded.min_single_rider_wait_minutes,
        max_single_rider_wait_minutes = excluded.max_single_rider_wait_minutes,
        total_data_points             = excluded.total_data_points,
        operational_percentage        = excluded.operational_percentage,
        downtime_minutes              = excluded.downtime_minutes,
        peak_wait_time_hour           = excluded.peak_wait_time_hour,
        peak_wait_time_value          = excluded.peak_wait_time_value,
        lowest_wait_time_hour         = excluded.lowest_wait_time_hour,
        hourly_data                   = excluded.hourly_data,
        updated_at                    = now();
end;
$$;


create or replace function public.aggregate_daily_from_hourly(p_ride_id uuid, p_date date, p_cleanup boolean default true)
returns void
language plpgsql
as $$
declare
    v_hourly       jsonb;
    v_hourly_count integer;
    v_raw_count    integer;
begin
    select jsonb_agg(jsonb_build_object(
               'h',     hour::int,
               'avg',   avg_wait_time_minutes,
               'avg_s', avg_single_rider_wait_minutes,
               'min',   min_wait_time_minutes,
               'max',   max_wait_time_minutes,
               'op',    operational_minutes,
               'data',  data_points_count
           ) order by hour),
           count(*)
      into v_hourly, v_hourly_count
      from hourly_ride_statistics
     where ride_id = p_ride_id
       and date = p_date;

    if v_hourly_count = 0 then
        raise notice 'No hourly data found for ride % on date %', p_ride_id, p_date;
        return;
    end if;

    perform upsert_daily_from_hourly_json(p_ride_id, p_date, v_hourly);

    if p_cleanup then
        -- recorded_at_local holds park-local wall time stored as if it were UTC
        delete from ride_wait_times
         where ride_id = p_ride_id
           and recorded_at_local >= p_date::timestamptz
           and recorded_at_local < (p_date + 1)::timestamptz;
        get diagnostics v_raw_count = row_count;

        delete from hourly_ride_statistics
         where ride_id = p_ride_id
           and date = p_date;

        raise notice 'Daily aggregation for ride % on % done (% raw and % hourly rows deleted)',
            p_ride_id, p_date, v_raw_count, v_hourly_count;
    end if;
end;
$$;


create or replace function public.aggregate_daily_for_park(p_park_id uuid, p_date date, p_cleanup boolean default true)
returns integer
language plpgsql
as $$
declare
    v_ride_id uuid;
    v_count   integer := 0;
begin
    -- Fallback source: rides that have raw poller data but no hourly rows yet
    -- (e.g. not present in the history API) get hourly rows built from raw data first.
    for v_ride_id in
        select r.id
          from rides r
         where r.park_id = p_park_id
           and not exists (select 1 from hourly_ride_statistics h
                            where h.ride_id = r.id and h.date = p_date)
           and exists (select 1 from ride_wait_times w
                        where w.ride_id = r.id
                          and w.recorded_at_local >= p_date::timestamptz
                          and w.recorded_at_local < (p_date + 1)::timestamptz)
    loop
        perform aggregate_all_hourly_stats_for_date(v_ride_id, p_date);
    end loop;

    for v_ride_id in
        select distinct h.ride_id
          from hourly_ride_statistics h
          join rides r on r.id = h.ride_id
         where r.park_id = p_park_id
           and h.date = p_date
    loop
        perform aggregate_daily_from_hourly(v_ride_id, p_date, p_cleanup);
        v_count := v_count + 1;
    end loop;

    return v_count;
end;
$$;


-- Only the backend (Windmill, service_role) may run these; never the public anon key.
revoke all on function public.upsert_daily_from_hourly_json(uuid, date, jsonb) from public, anon, authenticated;
revoke all on function public.aggregate_daily_from_hourly(uuid, date, boolean)  from public, anon, authenticated;
revoke all on function public.aggregate_daily_for_park(uuid, date, boolean)     from public, anon, authenticated;
grant execute on function public.upsert_daily_from_hourly_json(uuid, date, jsonb) to service_role;
grant execute on function public.aggregate_daily_from_hourly(uuid, date, boolean)  to service_role;
grant execute on function public.aggregate_daily_for_park(uuid, date, boolean)     to service_role;

commit;


-- -------------------------------------------------------------------------------------
-- Verification (read-only): recompute Space Mountain 2026-09-12 inside a transaction
-- and look at the result, then roll back. Expected: avg ≈ 31.6 (was 32.26),
-- operational_percentage ≈ 100 (was 73.89), downtime ≈ 0 (was 235).
-- -------------------------------------------------------------------------------------
-- begin;
-- select upsert_daily_from_hourly_json(d.ride_id, d.date, d.hourly_data)
--   from daily_ride_statistics d
--  where d.ride_id = (select id from rides where external_id = 'b2260923-9315-40fd-9c6b-44dd811dbe64')
--    and d.date = '2026-09-12';
-- select date, avg_wait_time_minutes, median_wait_time_minutes, operational_percentage,
--        downtime_minutes, peak_wait_time_hour, lowest_wait_time_hour, total_data_points
--   from daily_ride_statistics
--  where ride_id = (select id from rides where external_id = 'b2260923-9315-40fd-9c6b-44dd811dbe64')
--    and date = '2026-09-12';
-- rollback;
