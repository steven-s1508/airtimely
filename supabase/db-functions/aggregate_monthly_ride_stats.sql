DECLARE
    start_date DATE := make_date(p_year, p_month, 1);
    end_date DATE := (start_date + INTERVAL '1 month - 1 day')::DATE;
    monthly_data RECORD;
    weekday_data JSONB;
    hourly_summary JSONB;
    daily_count INTEGER;
    busiest_day DATE;
    quietest_day DATE;
    peak_hour_info RECORD;
    quietest_hour_info RECORD;
BEGIN
    -- Check if we have daily data for this month
    SELECT COUNT(*) INTO daily_count
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id 
    AND date >= start_date 
    AND date <= end_date;
    
    -- If no daily data exists, exit early
    IF daily_count = 0 THEN
        RAISE NOTICE 'No daily data found for ride % for month %/%', p_ride_id, p_month, p_year;
        RETURN;
    END IF;
    
    -- Calculate basic monthly statistics from daily aggregations
    SELECT 
        ROUND(AVG(avg_wait_time_minutes)::NUMERIC, 2)::DECIMAL(5,2) as avg_wait,
        MIN(min_wait_time_minutes)::INTEGER as min_wait,
        MAX(max_wait_time_minutes)::INTEGER as max_wait,
        ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_wait_time_minutes))::NUMERIC, 2)::DECIMAL(5,2) as median_wait,
        ROUND(AVG(avg_single_rider_wait_minutes)::NUMERIC, 2)::DECIMAL(5,2) as avg_single_rider,
        MIN(min_single_rider_wait_minutes)::INTEGER as min_single_rider,
        MAX(max_single_rider_wait_minutes)::INTEGER as max_single_rider,
        COUNT(*)::INTEGER as operating_days,
        SUM(total_data_points)::INTEGER as total_points,
        ROUND(AVG(operational_percentage)::NUMERIC, 2)::DECIMAL(5,2) as avg_op_percentage
    INTO monthly_data
    FROM daily_ride_statistics drs
    WHERE drs.ride_id = p_ride_id 
    AND drs.date >= start_date 
    AND drs.date <= end_date;
    
    -- Calculate weekday averages from daily data
    SELECT jsonb_build_object(
        'monday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 1 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'tuesday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 2 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'wednesday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 3 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'thursday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 4 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'friday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 5 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'saturday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 6 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2),
        'sunday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM drs.date) = 0 THEN drs.avg_wait_time_minutes END)::NUMERIC, 2)
    ) INTO weekday_data
    FROM daily_ride_statistics drs
    WHERE drs.ride_id = p_ride_id AND drs.date >= start_date AND drs.date <= end_date;
    
    -- Calculate hourly averages from daily.hourly_data JSONB (fixed nested aggregation)
    WITH hourly_expanded AS (
        SELECT 
            (hour_data->>'h')::INTEGER as hour,
            (hour_data->>'avg')::NUMERIC as avg_wait,
            (hour_data->>'data')::INTEGER as data_points
        FROM daily_ride_statistics drs,
             jsonb_array_elements(drs.hourly_data) as hour_data
        WHERE drs.ride_id = p_ride_id 
        AND drs.date >= start_date 
        AND drs.date <= end_date
        AND drs.hourly_data IS NOT NULL
        AND hour_data->>'avg' IS NOT NULL
    ),
    hourly_aggregated AS (
        SELECT 
            hour,
            ROUND(AVG(avg_wait)::NUMERIC, 2) as avg_wait,
            SUM(data_points) as total_data_points
        FROM hourly_expanded
        GROUP BY hour
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'hour', hour,
            'avg_wait', avg_wait,
            'data_points', total_data_points
        ) ORDER BY hour
    ) INTO hourly_summary
    FROM hourly_aggregated;
    
    -- Find busiest and quietest days
    SELECT drs.date INTO busiest_day
    FROM daily_ride_statistics drs
    WHERE drs.ride_id = p_ride_id AND drs.date >= start_date AND drs.date <= end_date
    ORDER BY drs.avg_wait_time_minutes DESC NULLS LAST
    LIMIT 1;
    
    SELECT drs.date INTO quietest_day
    FROM daily_ride_statistics drs
    WHERE drs.ride_id = p_ride_id AND drs.date >= start_date AND drs.date <= end_date
    ORDER BY drs.avg_wait_time_minutes ASC NULLS LAST
    LIMIT 1;
    
    -- Find peak hour from hourly JSONB data (fixed nested aggregation)
    WITH hourly_data_expanded AS (
        SELECT 
            (hour_data->>'h')::INTEGER as hour,
            (hour_data->>'avg')::NUMERIC as avg_wait
        FROM daily_ride_statistics drs,
             jsonb_array_elements(drs.hourly_data) as hour_data
        WHERE drs.ride_id = p_ride_id 
        AND drs.date >= start_date 
        AND drs.date <= end_date
        AND drs.hourly_data IS NOT NULL
        AND hour_data->>'avg' IS NOT NULL
    ),
    hourly_averages AS (
        SELECT 
            hour,
            AVG(avg_wait) as avg_wait
        FROM hourly_data_expanded
        GROUP BY hour
    )
    SELECT 
        hour::INTEGER as peak_hour,
        ROUND(avg_wait::NUMERIC, 2)::DECIMAL(5,2) as peak_avg_wait
    INTO peak_hour_info
    FROM hourly_averages
    ORDER BY avg_wait DESC
    LIMIT 1;
    
    -- Find quietest hour from hourly JSONB data (fixed nested aggregation)
    WITH hourly_data_expanded AS (
        SELECT 
            (hour_data->>'h')::INTEGER as hour,
            (hour_data->>'avg')::NUMERIC as avg_wait
        FROM daily_ride_statistics drs,
             jsonb_array_elements(drs.hourly_data) as hour_data
        WHERE drs.ride_id = p_ride_id 
        AND drs.date >= start_date 
        AND drs.date <= end_date
        AND drs.hourly_data IS NOT NULL
        AND hour_data->>'avg' IS NOT NULL
    ),
    hourly_averages AS (
        SELECT 
            hour,
            AVG(avg_wait) as avg_wait
        FROM hourly_data_expanded
        GROUP BY hour
    )
    SELECT 
        hour::INTEGER as quietest_hour,
        ROUND(avg_wait::NUMERIC, 2)::DECIMAL(5,2) as quietest_avg_wait
    INTO quietest_hour_info
    FROM hourly_averages
    ORDER BY avg_wait ASC
    LIMIT 1;
    
    -- Insert simplified monthly statistics
    INSERT INTO monthly_ride_statistics (
        ride_id, year, month, 
        avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes, median_wait_time_minutes,
        avg_single_rider_wait_minutes, min_single_rider_wait_minutes, max_single_rider_wait_minutes,
        total_operating_days, total_data_points, avg_operational_percentage,
        busiest_day_of_month, quietest_day_of_month, 
        peak_hour, peak_hour_avg_wait, quietest_hour, quietest_hour_avg_wait,
        weekday_averages
    )
    VALUES (
        p_ride_id, p_year, p_month,
        monthly_data.avg_wait, monthly_data.min_wait, monthly_data.max_wait, monthly_data.median_wait,
        monthly_data.avg_single_rider, monthly_data.min_single_rider, monthly_data.max_single_rider,
        monthly_data.operating_days, monthly_data.total_points, monthly_data.avg_op_percentage,
        busiest_day, quietest_day,
        peak_hour_info.peak_hour, peak_hour_info.peak_avg_wait, 
        quietest_hour_info.quietest_hour, quietest_hour_info.quietest_avg_wait,
        weekday_data
    )
    ON CONFLICT (ride_id, year, month) 
    DO UPDATE SET
        avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
        min_wait_time_minutes = EXCLUDED.min_wait_time_minutes,
        max_wait_time_minutes = EXCLUDED.max_wait_time_minutes,
        median_wait_time_minutes = EXCLUDED.median_wait_time_minutes,
        avg_single_rider_wait_minutes = EXCLUDED.avg_single_rider_wait_minutes,
        min_single_rider_wait_minutes = EXCLUDED.min_single_rider_wait_minutes,
        max_single_rider_wait_minutes = EXCLUDED.max_single_rider_wait_minutes,
        total_operating_days = EXCLUDED.total_operating_days,
        total_data_points = EXCLUDED.total_data_points,
        avg_operational_percentage = EXCLUDED.avg_operational_percentage,
        busiest_day_of_month = EXCLUDED.busiest_day_of_month,
        quietest_day_of_month = EXCLUDED.quietest_day_of_month,
        peak_hour = EXCLUDED.peak_hour,
        peak_hour_avg_wait = EXCLUDED.peak_hour_avg_wait,
        quietest_hour = EXCLUDED.quietest_hour,
        quietest_hour_avg_wait = EXCLUDED.quietest_hour_avg_wait,
        weekday_averages = EXCLUDED.weekday_averages,
        updated_at = NOW();
        
    RAISE NOTICE 'Monthly aggregation completed for ride % for %/% (%s operating days)', p_ride_id, p_month, p_year, monthly_data.operating_days;
END;