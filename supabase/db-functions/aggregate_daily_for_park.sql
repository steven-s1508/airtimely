/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE
   Signature: aggregate_daily_for_park(p_park_id uuid, p_date date, p_cleanup boolean default true)
   Source of truth: supabase/patches/2026-09-18_02_fix_daily_aggregation.sql */

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
