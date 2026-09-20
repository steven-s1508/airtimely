/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE
   Signature: aggregate_hourly_ride_stats(p_ride_id uuid, p_date date, p_hour integer)
   Source of truth: supabase/patches/2026-09-19_05_operating_only_hourly_data.sql */

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
