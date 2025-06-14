/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE */

DECLARE
    hour_num INTEGER;
BEGIN
    -- Process each hour of the day (0-23)
    FOR hour_num IN 0..23 LOOP
        PERFORM aggregate_hourly_ride_stats(p_ride_id, p_date, hour_num);
    END LOOP;
END;