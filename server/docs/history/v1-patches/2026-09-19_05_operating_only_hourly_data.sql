-- =====================================================================================
-- Operating-only wait statistics + clear old after-hours data (2026-09-19)
--
-- Principle: an hour only carries wait statistics for the time the ride was actually
-- OPERATING. Hours without operation have no average, so charts can show every hour
-- that has data without extra filtering.
--
--   - New data: aggregate_hourly_ride_stats averages only OPERATING samples (the
--     history backfill already only counts OPERATING minutes).
--   - Old poller data (up to 2026-09-13): its status is unreliable (rides were often
--     reported OPERATING overnight), so hours with no overlap with the park's official
--     OPERATING hours get their wait fields cleared (avg/avg_s/min/max = null, op = 0).
--     Hours in which the ride was never OPERATING (op = 0, e.g. DOWN with a frozen wait)
--     are cleared too, also on days without a known schedule. Hour entries stay in place.
--   - Daily wait statistics (avg, median, min, max, single rider, peak/lowest hour) only
--     use hours in which the ride operated inside park hours; a ride that never operated
--     gets NULL. Peak/lowest hour are NULL when every counted hour has the same average.
--
-- Before applying, confirm the hourly function's argument types are (uuid, date, integer);
-- otherwise CREATE OR REPLACE would add a second version:
--   select pg_get_function_arguments('public.aggregate_hourly_ride_stats'::regproc);
--
-- Apply: run STEP 1 (the whole transaction), check STEP 2, then run STEP 3 month by month.
-- The original hourly_data is still in daily_ride_statistics_backup_20260918 (patch 03).
-- =====================================================================================


-- STEP 1 — Functions (transaction-safe)
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
    select round(sum(avg_w * op_in) filter (where avg_w is not null and op_in > 0)
                     / nullif(sum(op_in) filter (where avg_w is not null and op_in > 0), 0), 2) as avg_wait,
           min(min_w) filter (where op_in > 0)                                                 as min_wait,
           max(max_w) filter (where op_in > 0)                                                 as max_wait,
           round((percentile_cont(0.5) within group (order by avg_w)
                      filter (where op_in > 0))::numeric, 2)                                   as median_wait,
           round(avg(avg_s) filter (where op_in > 0), 2)                                       as avg_single,
           round(min(avg_s) filter (where op_in > 0))::int                                     as min_single,
           round(max(avg_s) filter (where op_in > 0))::int                                     as max_single,
           coalesce(sum(pts), 0)::int                                                          as total_points,
           coalesce(sum(op_in), 0)                                                             as op_minutes,
           max(avg_w) filter (where op_in > 0) > min(avg_w) filter (where op_in > 0)           as has_peak,
           (array_agg(h order by avg_w desc, max_w desc)
                filter (where avg_w is not null and op_in > 0))[1]                             as peak_hour,
           (array_agg(max_w order by avg_w desc, max_w desc)
                filter (where avg_w is not null and op_in > 0))[1]                             as peak_value,
           (array_agg(h order by avg_w asc, min_w asc)
                filter (where avg_w is not null and op_in > 0))[1]                             as low_hour
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
        case when s.has_peak then s.peak_hour end,
        case when s.has_peak then s.peak_value end,
        case when s.has_peak then s.low_hour end,
        p_hourly
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


create or replace function public.aggregate_hourly_ride_stats(p_ride_id uuid, p_date date, p_hour integer)
returns void
language plpgsql
as $$
declare
    hourly_stats    record;
    start_timestamp timestamptz;
    end_timestamp   timestamptz;
    data_count      integer;
begin
    -- recorded_at_local holds park-local wall time stored as if it were UTC
    start_timestamp := (p_date + (p_hour || ' hours')::interval)::timestamptz;
    end_timestamp   := start_timestamp + interval '1 hour';

    select count(*) into data_count
      from ride_wait_times
     where ride_id = p_ride_id
       and recorded_at_local >= start_timestamp
       and recorded_at_local < end_timestamp;

    if data_count = 0 then
        raise notice 'No data found for ride % on date % hour %', p_ride_id, p_date, p_hour;
        return;
    end if;

    -- Wait statistics only from samples where the ride was OPERATING: rides often keep
    -- showing their last wait while DOWN or CLOSED.
    select round(avg(wait_time_minutes) filter (where status = 'OPERATING')::numeric, 2)::decimal(5,2)             as avg_wait,
           (min(wait_time_minutes) filter (where status = 'OPERATING'))::integer                                   as min_wait,
           (max(wait_time_minutes) filter (where status = 'OPERATING'))::integer                                   as max_wait,
           round(avg(single_rider_wait_time_minutes) filter (where status = 'OPERATING')::numeric, 2)::decimal(5,2) as avg_single_rider,
           count(*)::integer                                                                                      as data_points,
           (count(*) filter (where status = 'OPERATING') * 5)::integer                                            as operational_mins
      into hourly_stats
      from ride_wait_times
     where ride_id = p_ride_id
       and recorded_at_local >= start_timestamp
       and recorded_at_local < end_timestamp;

    insert into hourly_ride_statistics (
        ride_id, date, hour,
        avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        avg_single_rider_wait_minutes, data_points_count, operational_minutes
    )
    values (
        p_ride_id, p_date, p_hour,
        hourly_stats.avg_wait, hourly_stats.min_wait, hourly_stats.max_wait,
        hourly_stats.avg_single_rider, hourly_stats.data_points, hourly_stats.operational_mins
    )
    on conflict (ride_id, date, hour) do update set
        avg_wait_time_minutes         = excluded.avg_wait_time_minutes,
        min_wait_time_minutes         = excluded.min_wait_time_minutes,
        max_wait_time_minutes         = excluded.max_wait_time_minutes,
        avg_single_rider_wait_minutes = excluded.avg_single_rider_wait_minutes,
        data_points_count             = excluded.data_points_count,
        operational_minutes           = excluded.operational_minutes,
        updated_at                    = now();
end;
$$;


-- One-time helper for old data: clears the wait fields of hours in which the ride never
-- operated (op = 0) or that do not overlap the park's official OPERATING hours (only
-- checked when the day's schedule is known).
create or replace function public.clear_non_operating_hours(p_ride_id uuid, p_date date, p_hourly jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
    v_park_id uuid;
    v_tz      text;
    v_day     tstzrange;
    v_windows tstzrange[];
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

    return (
        select jsonb_agg(
                   case when coalesce((e->>'op')::numeric, 0) > 0
                             and (v_windows is null or exists (select 1 from unnest(v_windows) w where w && hr))
                        then e
                        else e || jsonb_build_object('avg', null, 'avg_s', null, 'min', null, 'max', null, 'op', 0)
                   end
                   order by (e->>'h')::int)
          from (select e,
                       tstzrange((p_date + make_interval(hours => (e->>'h')::int)) at time zone v_tz,
                                 (p_date + make_interval(hours => (e->>'h')::int + 1)) at time zone v_tz) as hr
                  from jsonb_array_elements(p_hourly) e) x
    );
end;
$$;


-- Recompute (replaces the patch 03 version): days up to p_clean_until first get their
-- non-operating and after-hours data cleared.
drop function if exists public.recompute_daily_stats(date, date);

create or replace function public.recompute_daily_stats(p_from date, p_to date, p_clean_until date default null)
returns integer
language plpgsql
as $$
declare
    r       record;
    v_count integer := 0;
begin
    for r in
        select ride_id, date, hourly_data
          from daily_ride_statistics
         where date between p_from and p_to
           and hourly_data is not null
    loop
        perform upsert_daily_from_hourly_json(
            r.ride_id,
            r.date,
            case when p_clean_until is not null and r.date <= p_clean_until
                 then clear_non_operating_hours(r.ride_id, r.date, r.hourly_data)
                 else r.hourly_data end
        );
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$$;


revoke all on function public.upsert_daily_from_hourly_json(uuid, date, jsonb)  from public, anon, authenticated;
revoke all on function public.aggregate_hourly_ride_stats(uuid, date, integer)   from public, anon, authenticated;
revoke all on function public.clear_non_operating_hours(uuid, date, jsonb) from public, anon, authenticated;
revoke all on function public.recompute_daily_stats(date, date, date)            from public, anon, authenticated;
grant execute on function public.upsert_daily_from_hourly_json(uuid, date, jsonb)  to service_role;
grant execute on function public.aggregate_hourly_ride_stats(uuid, date, integer)   to service_role;
grant execute on function public.clear_non_operating_hours(uuid, date, jsonb) to service_role;
grant execute on function public.recompute_daily_stats(date, date, date)            to service_role;

commit;


-- STEP 2 — Check (read-only): how many old days have no schedule (these stay unchanged)
select count(*)                                                        as old_daily_rows,
       count(*) filter (where not exists (
           select 1 from parks_schedule ps
            join rides r on r.park_id = ps.park_id
           where r.id = d.ride_id and ps.type = 'OPERATING'
             and ps.date between d.date - 1 and d.date))                as rows_without_schedule
  from daily_ride_statistics d
 where d.date <= '2026-09-13';


-- STEP 3 — Clean old days and recompute everything, one month per call, e.g.:
--   select recompute_daily_stats('2025-06-01', '2025-06-30', '2026-09-13');
--   ...
--   select recompute_daily_stats('2026-09-01', '2026-09-30', '2026-09-13');
