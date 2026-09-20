-- =====================================================================================
-- Merge leftover hourly rows into their daily rows (2026-09-19)
--
-- Background: until early 2026 the daily job sometimes ran before a (mostly American)
-- park's day had ended. It built the daily row from the hours available at that moment
-- and deleted the day's raw data; the evening hours aggregated afterwards stayed in
-- hourly_ride_statistics and were never folded into hourly_data. Their raw data has
-- since been purged, so these rows are the only copy of those hours.
--
-- This patch:
--   - adds every leftover hour WITH data (a wait or operating minutes) to the day's
--     hourly_data and recomputes the daily row (creating it if missing),
--   - ignores leftover hours without any data,
--   - then deletes all hourly rows up to 2026-09-13 (everything before the outage
--     backfill; nothing in that range is still pending aggregation).
--
-- Requires patches 02 and 03 (and their backup table). Run step by step.
-- =====================================================================================


-- STEP 1 — Preview (read-only): what will happen per category
with lo as (
    select h.ride_id, h.date,
           (h.avg_wait_time_minutes is not null or coalesce(h.operational_minutes, 0) > 0) as has_data
      from hourly_ride_statistics h
      left join daily_ride_statistics d on d.ride_id = h.ride_id and d.date = h.date
     where h.date <= '2026-09-13'
       and not exists (select 1 from jsonb_array_elements(d.hourly_data) x where (x->>'h')::int = h.hour)
), days as (
    select lo.ride_id, lo.date, bool_or(lo.has_data) as any_data, count(*) as hours,
           exists (select 1 from daily_ride_statistics d where d.ride_id = lo.ride_id and d.date = lo.date) as has_daily
      from lo
     group by lo.ride_id, lo.date
)
select case when not any_data then 'ignore (no data)'
            when has_daily    then 'merge into existing daily row'
            else                   'create missing daily row' end as action,
       count(*)   as ride_days,
       sum(hours) as hourly_rows
  from days
 group by 1
 order by 1;


-- STEP 2 — The merge function
create or replace function public.merge_leftover_hourly_rows(p_to date)
returns table (days_merged integer, days_created integer)
language plpgsql
as $$
declare
    r         record;
    v_merged  integer := 0;
    v_created integer := 0;
begin
    for r in
        with lo as (
            select h.ride_id, h.date,
                   jsonb_build_object(
                       'h',     h.hour::int,
                       'avg',   h.avg_wait_time_minutes,
                       'avg_s', h.avg_single_rider_wait_minutes,
                       'min',   h.min_wait_time_minutes,
                       'max',   h.max_wait_time_minutes,
                       'op',    h.operational_minutes,
                       'data',  h.data_points_count
                   ) as e
              from hourly_ride_statistics h
              left join daily_ride_statistics d on d.ride_id = h.ride_id and d.date = h.date
             where h.date <= p_to
               and (h.avg_wait_time_minutes is not null or coalesce(h.operational_minutes, 0) > 0)
               and not exists (select 1 from jsonb_array_elements(d.hourly_data) x
                                where (x->>'h')::int = h.hour)
        )
        select lo.ride_id, lo.date, jsonb_agg(lo.e) as new_hours,
               d.ride_id is not null as has_daily,
               d.hourly_data
          from lo
          left join daily_ride_statistics d on d.ride_id = lo.ride_id and d.date = lo.date
         group by lo.ride_id, lo.date, d.ride_id, d.hourly_data
    loop
        perform upsert_daily_from_hourly_json(
            r.ride_id,
            r.date,
            (select jsonb_agg(x order by (x->>'h')::int)
               from jsonb_array_elements(coalesce(r.hourly_data, '[]'::jsonb) || r.new_hours) x)
        );

        if r.has_daily then
            v_merged := v_merged + 1;
        else
            v_created := v_created + 1;
        end if;
    end loop;

    return query select v_merged, v_created;
end;
$$;

revoke all on function public.merge_leftover_hourly_rows(date) from public, anon, authenticated;
grant execute on function public.merge_leftover_hourly_rows(date) to service_role;


-- STEP 3 — Run the merge (one transaction; should take well under a minute)
select * from merge_leftover_hourly_rows('2026-09-13');


-- STEP 4 — Check (read-only): every leftover hour with data is now in hourly_data.
-- Expected: uncovered_with_data = 0
select count(*) filter (where h.avg_wait_time_minutes is not null or coalesce(h.operational_minutes, 0) > 0) as uncovered_with_data,
       count(*) as uncovered_total
  from hourly_ride_statistics h
  left join daily_ride_statistics d on d.ride_id = h.ride_id and d.date = h.date
 where h.date <= '2026-09-13'
   and not exists (select 1 from jsonb_array_elements(d.hourly_data) x where (x->>'h')::int = h.hour);


-- STEP 5 — ONLY if step 4 shows uncovered_with_data = 0: remove all leftovers
-- delete from hourly_ride_statistics where date <= '2026-09-13';


-- STEP 6 — Give the space back (brief exclusive lock on hourly_ride_statistics; the
-- hourly job at :05 simply waits a few seconds). Run it on its own.
-- vacuum full public.hourly_ride_statistics;
