/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE
   Signature: upsert_daily_from_hourly_json(p_ride_id uuid, p_date date, p_hourly jsonb)
   Source of truth: supabase/patches/2026-09-19_05_operating_only_hourly_data.sql */

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
