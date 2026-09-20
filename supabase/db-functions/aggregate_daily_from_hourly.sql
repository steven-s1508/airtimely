/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE
   Signature: aggregate_daily_from_hourly(p_ride_id uuid, p_date date, p_cleanup boolean default true)
   Source of truth: supabase/patches/2026-09-18_02_fix_daily_aggregation.sql */

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
