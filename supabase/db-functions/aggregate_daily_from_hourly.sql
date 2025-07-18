
DECLARE
    daily_stats RECORD;
    peak_hour_data RECORD;
    lowest_hour_data RECORD;
    hourly_count INTEGER;
    park_open_hours INTEGER;
    park_info RECORD;
BEGIN
    -- Get park info and operating hours for this date
    SELECT 
        r.park_id,
        poh.opening_time,
        poh.closing_time,
        CASE 
            WHEN poh.opening_time IS NOT NULL AND poh.closing_time IS NOT NULL THEN
                EXTRACT(HOUR FROM poh.closing_time::TIME - poh.opening_time::TIME)
            ELSE 24 -- Default to 24 hours if no schedule data
        END as operating_hours
    INTO park_info
    FROM rides r
    LEFT JOIN park_operating_hours poh ON r.park_id = poh.park_id AND poh.date = p_date
    WHERE r.id = p_ride_id;
    
    -- Check if we have hourly data for this date
    SELECT COUNT(*) INTO hourly_count
    FROM hourly_ride_statistics hrs
    WHERE hrs.ride_id = p_ride_id AND hrs.date = p_date;
    
    -- If no hourly data exists, exit early
    IF hourly_count = 0 THEN
        RAISE NOTICE 'No hourly data found for ride % on date %', p_ride_id, p_date;
        RETURN;
    END IF;
    
    -- Set park open hours for calculations
    park_open_hours := COALESCE(park_info.operating_hours, 24);
    
    -- Aggregate hourly statistics into daily statistics (filtered by park hours)
    SELECT 
        COALESCE(ROUND(AVG(hrs.avg_wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_wait,
        COALESCE(MIN(hrs.min_wait_time_minutes), 0)::INTEGER as min_wait,
        COALESCE(MAX(hrs.max_wait_time_minutes), 0)::INTEGER as max_wait,
        COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hrs.avg_wait_time_minutes))::NUMERIC, 2), 0)::DECIMAL(5,2) as median_wait,
        COALESCE(ROUND(AVG(hrs.avg_single_rider_wait_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_single_rider,
        COALESCE(MIN(hrs.avg_single_rider_wait_minutes), 0)::INTEGER as min_single_rider,
        COALESCE(MAX(hrs.avg_single_rider_wait_minutes), 0)::INTEGER as max_single_rider,
        COALESCE(SUM(hrs.data_points_count), 0)::INTEGER as total_points,
        -- Calculate operational percentage based on park hours
        CASE 
            WHEN park_open_hours > 0 THEN
                COALESCE(ROUND((SUM(hrs.operational_minutes) * 100.0 / (park_open_hours * 60))::NUMERIC, 2), 0)::DECIMAL(5,2)
            ELSE 0
        END as op_percentage,
        -- Calculate downtime only during park hours
        COALESCE((park_open_hours * 60) - SUM(COALESCE(hrs.operational_minutes, 0)), 0)::INTEGER as downtime_mins
    INTO daily_stats
    FROM hourly_ride_statistics hrs
    WHERE hrs.ride_id = p_ride_id 
    AND hrs.date = p_date
    AND (
        park_info.opening_time IS NULL OR 
        park_info.closing_time IS NULL OR
        hrs.hour >= EXTRACT(HOUR FROM park_info.opening_time::TIME) AND 
        hrs.hour < EXTRACT(HOUR FROM park_info.closing_time::TIME)
    );
    
    -- Find peak hour (hour with highest average wait time) during park hours
    SELECT 
        hrs.hour,
        hrs.max_wait_time_minutes as max_wait
    INTO peak_hour_data
    FROM hourly_ride_statistics hrs
    WHERE hrs.ride_id = p_ride_id 
    AND hrs.date = p_date
    AND hrs.avg_wait_time_minutes IS NOT NULL
    AND (
        park_info.opening_time IS NULL OR 
        park_info.closing_time IS NULL OR
        hrs.hour >= EXTRACT(HOUR FROM park_info.opening_time::TIME) AND 
        hrs.hour < EXTRACT(HOUR FROM park_info.closing_time::TIME)
    )
    ORDER BY hrs.avg_wait_time_minutes DESC, hrs.max_wait_time_minutes DESC
    LIMIT 1;
    
    -- Find lowest hour (hour with lowest average wait time) during park hours
    SELECT 
        hrs.hour
    INTO lowest_hour_data
    FROM hourly_ride_statistics hrs
    WHERE hrs.ride_id = p_ride_id 
    AND hrs.date = p_date
    AND hrs.avg_wait_time_minutes IS NOT NULL
    AND (
        park_info.opening_time IS NULL OR 
        park_info.closing_time IS NULL OR
        hrs.hour >= EXTRACT(HOUR FROM park_info.opening_time::TIME) AND 
        hrs.hour < EXTRACT(HOUR FROM park_info.closing_time::TIME)
    )
    ORDER BY hrs.avg_wait_time_minutes ASC, hrs.min_wait_time_minutes ASC
    LIMIT 1;
    
    -- Insert or update daily statistics
    INSERT INTO daily_ride_statistics (
        ride_id, date, avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        median_wait_time_minutes, avg_single_rider_wait_minutes, min_single_rider_wait_minutes,
        max_single_rider_wait_minutes, total_data_points, operational_percentage, downtime_minutes,
        peak_wait_time_hour, peak_wait_time_value, lowest_wait_time_hour
    )
    VALUES (
        p_ride_id, p_date, daily_stats.avg_wait, daily_stats.min_wait, daily_stats.max_wait,
        daily_stats.median_wait, daily_stats.avg_single_rider, daily_stats.min_single_rider,
        daily_stats.max_single_rider, daily_stats.total_points, daily_stats.op_percentage,
        daily_stats.downtime_mins, peak_hour_data.hour, peak_hour_data.max_wait, 
        lowest_hour_data.hour
    )
    ON CONFLICT (ride_id, date) 
    DO UPDATE SET
        avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
        min_wait_time_minutes = EXCLUDED.min_wait_time_minutes,
        max_wait_time_minutes = EXCLUDED.max_wait_time_minutes,
        median_wait_time_minutes = EXCLUDED.median_wait_time_minutes,
        avg_single_rider_wait_minutes = EXCLUDED.avg_single_rider_wait_minutes,
        min_single_rider_wait_minutes = EXCLUDED.min_single_rider_wait_minutes,
        max_single_rider_wait_minutes = EXCLUDED.max_single_rider_wait_minutes,
        total_data_points = EXCLUDED.total_data_points,
        operational_percentage = EXCLUDED.operational_percentage,
        downtime_minutes = EXCLUDED.downtime_minutes,
        peak_wait_time_hour = EXCLUDED.peak_wait_time_hour,
        peak_wait_time_value = EXCLUDED.peak_wait_time_value,
        lowest_wait_time_hour = EXCLUDED.lowest_wait_time_hour,
        updated_at = NOW();
        
    RAISE NOTICE 'Daily aggregation completed for ride % on date % (park open % hours)', p_ride_id, p_date, park_open_hours;
END;
