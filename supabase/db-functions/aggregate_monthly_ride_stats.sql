/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE */

DECLARE
    start_date DATE := make_date(p_year, p_month, 1);
    end_date DATE := (start_date + INTERVAL '1 month - 1 day')::DATE;
    monthly_data RECORD;
    weekday_data JSONB;
    hourly_data JSONB;
    daily_data JSONB;
    busiest_day DATE;
    quietest_day DATE;
    peak_hour_info RECORD;
    quietest_hour_info RECORD;
BEGIN
    -- Calculate basic monthly statistics from daily aggregations
    SELECT 
        ROUND(AVG(avg_wait_time_minutes), 2)::DECIMAL(5,2) as avg_wait,
        MIN(min_wait_time_minutes)::INTEGER as min_wait,
        MAX(max_wait_time_minutes)::INTEGER as max_wait,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_wait_time_minutes), 2)::DECIMAL(5,2) as median_wait,
        ROUND(AVG(avg_single_rider_wait_minutes), 2)::DECIMAL(5,2) as avg_single_rider,
        MIN(min_single_rider_wait_minutes)::INTEGER as min_single_rider,
        MAX(max_single_rider_wait_minutes)::INTEGER as max_single_rider,
        COUNT(*)::INTEGER as operating_days,
        SUM(total_data_points)::INTEGER as total_points,
        ROUND(AVG(operational_percentage), 2)::DECIMAL(5,2) as avg_op_percentage
    INTO monthly_data
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id 
    AND date >= start_date 
    AND date <= end_date;
    
    -- Calculate weekday averages
    SELECT jsonb_build_object(
        'monday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 1 THEN avg_wait_time_minutes END), 2),
        'tuesday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 2 THEN avg_wait_time_minutes END), 2),
        'wednesday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 3 THEN avg_wait_time_minutes END), 2),
        'thursday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 4 THEN avg_wait_time_minutes END), 2),
        'friday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 5 THEN avg_wait_time_minutes END), 2),
        'saturday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 6 THEN avg_wait_time_minutes END), 2),
        'sunday', ROUND(AVG(CASE WHEN EXTRACT(DOW FROM date) = 0 THEN avg_wait_time_minutes END), 2)
    ) INTO weekday_data
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id AND date >= start_date AND date <= end_date;
    
    -- Calculate hourly averages from raw data
    SELECT jsonb_agg(
        jsonb_build_object(
            'hour', hour,
            'avg_wait', ROUND(avg_wait, 2),
            'data_points', data_points
        ) ORDER BY hour
    ) INTO hourly_data
    FROM (
        SELECT 
            EXTRACT(HOUR FROM recorded_at_local)::INTEGER as hour,
            AVG(wait_time_minutes) as avg_wait,
            COUNT(*) as data_points
        FROM ride_wait_times
        WHERE ride_id = p_ride_id 
        AND DATE(recorded_at_local) >= start_date 
        AND DATE(recorded_at_local) <= end_date
        AND wait_time_minutes IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM recorded_at_local)
    ) hourly_summary;
    
    -- Calculate daily breakdown
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date,
            'avg_wait', avg_wait_time_minutes,
            'min_wait', min_wait_time_minutes,
            'max_wait', max_wait_time_minutes,
            'day_of_week', EXTRACT(DOW FROM date),
            'is_weekend', EXTRACT(DOW FROM date) IN (0, 6)
        ) ORDER BY date
    ) INTO daily_data
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id AND date >= start_date AND date <= end_date;
    
    -- Find busiest and quietest days
    SELECT date INTO busiest_day
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id AND date >= start_date AND date <= end_date
    ORDER BY avg_wait_time_minutes DESC NULLS LAST
    LIMIT 1;
    
    SELECT date INTO quietest_day
    FROM daily_ride_statistics
    WHERE ride_id = p_ride_id AND date >= start_date AND date <= end_date
    ORDER BY avg_wait_time_minutes ASC NULLS LAST
    LIMIT 1;
    
    -- Find peak and quietest hours
    SELECT 
        hour::INTEGER as peak_hour,
        ROUND(avg_wait, 2)::DECIMAL(5,2) as peak_avg_wait
    INTO peak_hour_info
    FROM (
        SELECT 
            EXTRACT(HOUR FROM recorded_at_local) as hour,
            AVG(wait_time_minutes) as avg_wait
        FROM ride_wait_times
        WHERE ride_id = p_ride_id 
        AND DATE(recorded_at_local) >= start_date 
        AND DATE(recorded_at_local) <= end_date
        AND wait_time_minutes IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM recorded_at_local)
    ) hourly_analysis
    ORDER BY avg_wait DESC
    LIMIT 1;
    
    SELECT 
        hour::INTEGER as quietest_hour,
        ROUND(avg_wait, 2)::DECIMAL(5,2) as quietest_avg_wait
    INTO quietest_hour_info
    FROM (
        SELECT 
            EXTRACT(HOUR FROM recorded_at_local) as hour,
            AVG(wait_time_minutes) as avg_wait
        FROM ride_wait_times
        WHERE ride_id = p_ride_id 
        AND DATE(recorded_at_local) >= start_date 
        AND DATE(recorded_at_local) <= end_date
        AND wait_time_minutes IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM recorded_at_local)
    ) hourly_analysis
    ORDER BY avg_wait ASC
    LIMIT 1;
    
    -- Insert monthly statistics
    INSERT INTO monthly_ride_statistics (
        ride_id, year, month, avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
        median_wait_time_minutes, avg_single_rider_wait_minutes, min_single_rider_wait_minutes,
        max_single_rider_wait_minutes, weekday_averages, daily_averages,
        total_operating_days, total_data_points, avg_operational_percentage,
        busiest_day_of_month, quietest_day_of_month, peak_hour, peak_hour_avg_wait,
        quietest_hour, quietest_hour_avg_wait
    )
    VALUES (
        p_ride_id, p_year, p_month, monthly_data.avg_wait, monthly_data.min_wait, monthly_data.max_wait,
        monthly_data.median_wait, monthly_data.avg_single_rider, monthly_data.min_single_rider,
        monthly_data.max_single_rider, weekday_data, daily_data,
        monthly_data.operating_days, monthly_data.total_points, monthly_data.avg_op_percentage,
        busiest_day, quietest_day, peak_hour_info.peak_hour, peak_hour_info.peak_avg_wait,
        quietest_hour_info.quietest_hour, quietest_hour_info.quietest_avg_wait
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
        weekday_averages = EXCLUDED.weekday_averages,
        daily_averages = EXCLUDED.daily_averages,
        total_operating_days = EXCLUDED.total_operating_days,
        total_data_points = EXCLUDED.total_data_points,
        avg_operational_percentage = EXCLUDED.avg_operational_percentage,
        busiest_day_of_month = EXCLUDED.busiest_day_of_month,
        quietest_day_of_month = EXCLUDED.quietest_day_of_month,
        peak_hour = EXCLUDED.peak_hour,
        peak_hour_avg_wait = EXCLUDED.peak_hour_avg_wait,
        quietest_hour = EXCLUDED.quietest_hour,
        quietest_hour_avg_wait = EXCLUDED.quietest_hour_avg_wait,
        updated_at = NOW();
END;