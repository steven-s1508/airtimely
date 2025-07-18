DECLARE
    hourly_stats RECORD;
    start_timestamp TIMESTAMPTZ;
    end_timestamp TIMESTAMPTZ;
    date_info RECORD;
    weather_info RECORD;
    park_id_var UUID;
BEGIN
    -- Calculate hour boundaries using local time
    start_timestamp := (p_date + (p_hour || ' hours')::INTERVAL)::TIMESTAMPTZ;
    end_timestamp := start_timestamp + INTERVAL '1 hour';
    
    -- Get park ID for weather/holiday lookups
    SELECT r.park_id INTO park_id_var
    FROM rides r 
    WHERE r.id = p_ride_id;
    
    -- Calculate date characteristics and holiday status in one query
    SELECT 
        EXTRACT(DOW FROM p_date)::INTEGER as day_of_week,
        (EXTRACT(DOW FROM p_date) IN (0, 6)) as is_weekend,
        EXISTS(
            SELECT 1 FROM holidays h
            WHERE h.date = p_date 
            AND (h.country_code IS NULL OR h.country_code = (
                SELECT country_code FROM parks WHERE id = park_id_var
            ))
        ) as is_holiday
    INTO date_info;
    
    -- Get weather data for this date and park
    SELECT 
        temperature_high_celsius as temperature,
        condition as weather_condition
    INTO weather_info
    FROM daily_weather
    WHERE park_id = park_id_var AND date = p_date;
    
    -- Calculate hourly statistics from raw wait time data
    SELECT 
        COALESCE(ROUND(AVG(wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_wait,
        COALESCE(MIN(wait_time_minutes), 0)::INTEGER as min_wait,
        COALESCE(MAX(wait_time_minutes), 0)::INTEGER as max_wait,
        COALESCE(ROUND(AVG(single_rider_wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_single_rider,
        COUNT(*)::INTEGER as data_points,
        (COUNT(CASE WHEN status = 'OPERATING' THEN 1 END) * 5)::INTEGER as operational_mins
    INTO hourly_stats
    FROM ride_wait_times 
    WHERE ride_id = p_ride_id 
    AND recorded_at_local >= start_timestamp 
    AND recorded_at_local < end_timestamp;
    
    -- Insert or update hourly statistics
    INSERT INTO hourly_ride_statistics (
        ride_id, date, hour, day_of_week, is_weekend, is_holiday,
        avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        avg_single_rider_wait_minutes, data_points_count, operational_minutes,
        temperature_celsius, weather_condition
    )
    VALUES (
        p_ride_id, p_date, p_hour, date_info.day_of_week, date_info.is_weekend, 
        date_info.is_holiday, hourly_stats.avg_wait, hourly_stats.min_wait, 
        hourly_stats.max_wait, hourly_stats.avg_single_rider, hourly_stats.data_points,
        hourly_stats.operational_mins, weather_info.temperature, weather_info.weather_condition
    )
    ON CONFLICT (ride_id, date, hour) 
    DO UPDATE SET
        avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
        min_wait_time_minutes = EXCLUDED.min_wait_time_minutes,
        max_wait_time_minutes = EXCLUDED.max_wait_time_minutes,
        avg_single_rider_wait_minutes = EXCLUDED.avg_single_rider_wait_minutes,
        data_points_count = EXCLUDED.data_points_count,
        operational_minutes = EXCLUDED.operational_minutes,
        temperature_celsius = EXCLUDED.temperature_celsius,
        weather_condition = EXCLUDED.weather_condition;
END;