DECLARE
    hourly_stats RECORD;
    start_timestamp TIMESTAMPTZ;
    end_timestamp TIMESTAMPTZ;
    data_count INTEGER;
BEGIN
    -- Calculate hour boundaries using local time
    start_timestamp := (p_date + (p_hour || ' hours')::INTERVAL)::TIMESTAMPTZ;
    end_timestamp := start_timestamp + INTERVAL '1 hour';
    
    -- Check if we have any data for this hour first
    SELECT COUNT(*) INTO data_count
    FROM ride_wait_times 
    WHERE ride_id = p_ride_id 
    AND recorded_at_local >= start_timestamp 
    AND recorded_at_local < end_timestamp;
    
    -- Exit early if no data exists for this hour
    IF data_count = 0 THEN
        RAISE NOTICE 'No data found for ride % on date % hour %', p_ride_id, p_date, p_hour;
        RETURN;
    END IF;
    
    -- Calculate hourly statistics from raw wait time data
    SELECT 
        ROUND(AVG(wait_time_minutes)::NUMERIC, 2)::DECIMAL(5,2) as avg_wait,
        MIN(wait_time_minutes)::INTEGER as min_wait,
        MAX(wait_time_minutes)::INTEGER as max_wait,
        ROUND(AVG(single_rider_wait_time_minutes)::NUMERIC, 2)::DECIMAL(5,2) as avg_single_rider,
        COUNT(*)::INTEGER as data_points,
        (COUNT(CASE WHEN status = 'OPERATING' THEN 1 END) * 5)::INTEGER as operational_mins
    INTO hourly_stats
    FROM ride_wait_times 
    WHERE ride_id = p_ride_id 
    AND recorded_at_local >= start_timestamp 
    AND recorded_at_local < end_timestamp;
    
    -- Insert or update hourly statistics (only when we have real data)
    INSERT INTO hourly_ride_statistics (
        ride_id, date, hour,
        avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        avg_single_rider_wait_minutes, data_points_count, operational_minutes
    )
    VALUES (
        p_ride_id, p_date, p_hour, 
        hourly_stats.avg_wait, hourly_stats.min_wait, hourly_stats.max_wait,
        hourly_stats.avg_single_rider, hourly_stats.data_points, hourly_stats.operational_mins
    )
    ON CONFLICT (ride_id, date, hour) 
    DO UPDATE SET
        avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
        min_wait_time_minutes = EXCLUDED.min_wait_time_minutes,
        max_wait_time_minutes = EXCLUDED.max_wait_time_minutes,
        avg_single_rider_wait_minutes = EXCLUDED.avg_single_rider_wait_minutes,
        data_points_count = EXCLUDED.data_points_count,
        operational_minutes = EXCLUDED.operational_minutes,
        updated_at = NOW();
        
    RAISE NOTICE 'Hourly aggregation completed for ride % on date % hour % (%s data points)', p_ride_id, p_date, p_hour, hourly_stats.data_points;
END;