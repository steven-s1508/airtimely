DECLARE
    hour_num INTEGER;
BEGIN
    RAISE NOTICE 'Starting hourly aggregation for all hours for ride % on date %', p_ride_id, p_date;
    
    -- Process each hour of the day (0-23)
    FOR hour_num IN 0..23 LOOP
        PERFORM aggregate_hourly_ride_stats(p_ride_id, p_date, hour_num);
    END LOOP;
    
    RAISE NOTICE 'Completed hourly aggregation for all hours for ride % on date %', p_ride_id, p_date;
END;