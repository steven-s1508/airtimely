/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE */

DECLARE
    daily_stats RECORD;
    start_timestamp TIMESTAMPTZ;
    end_timestamp TIMESTAMPTZ;
    peak_hour_data RECORD;
    lowest_hour_data RECORD;
BEGIN
    -- Calculate date boundaries using local time
    start_timestamp := p_date::TIMESTAMPTZ;
    end_timestamp := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
    
    -- Calculate daily statistics using local timestamps
    SELECT 
        COALESCE(ROUND(AVG(wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_wait,
        COALESCE(MIN(wait_time_minutes), 0)::INTEGER as min_wait,
        COALESCE(MAX(wait_time_minutes), 0)::INTEGER as max_wait,
        COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as median_wait,
        COALESCE(ROUND(AVG(single_rider_wait_time_minutes)::NUMERIC, 2), 0)::DECIMAL(5,2) as avg_single_rider,
        COALESCE(MIN(single_rider_wait_time_minutes), 0)::INTEGER as min_single_rider,
        COALESCE(MAX(single_rider_wait_time_minutes), 0)::INTEGER as max_single_rider,
        COUNT(*)::INTEGER as total_points,
        COALESCE(ROUND((COUNT(CASE WHEN status = 'OPERATING' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0))::NUMERIC, 2), 0)::DECIMAL(5,2) as op_percentage,
        (COUNT(CASE WHEN status NOT IN ('OPERATING', 'CLOSED') THEN 1 END) * 5)::INTEGER as downtime_mins
    INTO daily_stats
    FROM ride_wait_times 
    WHERE ride_id = p_ride_id 
    AND recorded_at_local >= start_timestamp 
    AND recorded_at_local < end_timestamp;
    
    -- Get peak hour analysis (hour with highest average wait time)
    SELECT 
        hour,
        max_wait
    INTO peak_hour_data
    FROM (
        SELECT 
            EXTRACT(HOUR FROM recorded_at_local)::INTEGER as hour,
            AVG(wait_time_minutes)::NUMERIC as hourly_avg,
            MAX(wait_time_minutes)::INTEGER as max_wait
        FROM ride_wait_times 
        WHERE ride_id = p_ride_id 
        AND recorded_at_local >= start_timestamp 
        AND recorded_at_local < end_timestamp
        AND wait_time_minutes IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM recorded_at_local)
    ) hourly_data
    ORDER BY hourly_avg DESC, max_wait DESC
    LIMIT 1;
    
    -- Get lowest hour analysis (hour with lowest average wait time)
    SELECT 
        hour
    INTO lowest_hour_data
    FROM (
        SELECT 
            EXTRACT(HOUR FROM recorded_at_local)::INTEGER as hour,
            AVG(wait_time_minutes)::NUMERIC as hourly_avg
        FROM ride_wait_times 
        WHERE ride_id = p_ride_id 
        AND recorded_at_local >= start_timestamp 
        AND recorded_at_local < end_timestamp
        AND wait_time_minutes IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM recorded_at_local)
    ) hourly_data
    ORDER BY hourly_avg ASC
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
END;