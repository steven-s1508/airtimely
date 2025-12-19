-- Function to retroactively fix daily_ride_statistics using hourly_data and correct park hours filtering
CREATE OR REPLACE FUNCTION retroactively_fix_daily_stats_from_hourly_data(
    p_date DATE DEFAULT NULL,
    p_ride_id UUID DEFAULT NULL
)
RETURNS TABLE(
    processed_count INTEGER,
    updated_count INTEGER,
    error_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    daily_record RECORD;
    park_info RECORD;
    filtered_hourly_data JSONB;
    hourly_record JSONB;
    hour_value INTEGER;
    total_processed INTEGER := 0;
    total_updated INTEGER := 0;
    total_errors INTEGER := 0;
    query_text TEXT;
BEGIN
    -- Build dynamic query based on parameters
    query_text := 'SELECT id, ride_id, date, hourly_data FROM daily_ride_statistics WHERE hourly_data IS NOT NULL';
    
    IF p_date IS NOT NULL THEN
        query_text := query_text || ' AND date = $1';
    END IF;
    
    IF p_ride_id IS NOT NULL THEN
        query_text := query_text || ' AND ride_id = $2';
    END IF;
    
    query_text := query_text || ' ORDER BY date DESC';
    
    -- Process daily_ride_statistics that match the criteria
    FOR daily_record IN 
        EXECUTE query_text
        USING p_date, p_ride_id
    LOOP
        BEGIN
            total_processed := total_processed + 1;
            
            -- Get park info and operating hours for this date
            SELECT 
                p.timezone,
                poh.opening_time,
                poh.closing_time
            INTO park_info
            FROM rides r
            JOIN parks p ON r.park_id = p.id
            LEFT JOIN park_operating_hours poh ON r.park_id = poh.park_id AND poh.date = daily_record.date
            WHERE r.id = daily_record.ride_id;
            
            -- Skip if no park info or no operating hours
            IF park_info.opening_time IS NULL OR park_info.closing_time IS NULL THEN
                total_errors := total_errors + 1;
                CONTINUE;
            END IF;
            
            -- Filter hourly_data based on park operating hours using the corrected logic
            filtered_hourly_data := '[]'::jsonb;
            
            FOR hourly_record IN 
                SELECT jsonb_array_elements(daily_record.hourly_data)
            LOOP
                hour_value := (hourly_record->>'h')::INTEGER;
                
                -- Apply the same corrected filtering logic as in aggregate_daily_from_hourly.sql
                IF (
                    -- Create timestamp for this hour and check if it falls within park hours
                    (daily_record.date + make_interval(hours => hour_value))::timestamptz
                    AT TIME ZONE park_info.timezone
                    >= park_info.opening_time AT TIME ZONE park_info.timezone
                    AND
                    (daily_record.date + make_interval(hours => hour_value) + INTERVAL '1 hour')::timestamptz
                    AT TIME ZONE park_info.timezone
                    <= park_info.closing_time AT TIME ZONE park_info.timezone
                ) THEN
                    filtered_hourly_data := filtered_hourly_data || hourly_record;
                END IF;
            END LOOP;
            
            -- Recalculate statistics from filtered hourly data
            IF jsonb_array_length(filtered_hourly_data) > 0 THEN
                -- Update the daily statistics with recalculated values
                UPDATE daily_ride_statistics 
                SET 
                    avg_wait_time_minutes = (
                        SELECT COALESCE(ROUND(AVG((h->>'avg')::NUMERIC)::NUMERIC, 2), 0)::DECIMAL(5,2)
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg' IS NOT NULL AND (h->>'avg')::TEXT != 'null'
                    ),
                    min_wait_time_minutes = (
                        SELECT COALESCE(MIN((h->>'min')::INTEGER), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'min' IS NOT NULL AND (h->>'min')::TEXT != 'null'
                    ),
                    max_wait_time_minutes = (
                        SELECT COALESCE(MAX((h->>'max')::INTEGER), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'max' IS NOT NULL AND (h->>'max')::TEXT != 'null'
                    ),
                    median_wait_time_minutes = (
                        SELECT COALESCE(ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (h->>'avg')::NUMERIC))::NUMERIC, 2), 0)::DECIMAL(5,2)
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg' IS NOT NULL AND (h->>'avg')::TEXT != 'null'
                    ),
                    avg_single_rider_wait_minutes = (
                        SELECT COALESCE(ROUND(AVG((h->>'avg_s')::NUMERIC)::NUMERIC, 2), 0)::DECIMAL(5,2)
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg_s' IS NOT NULL AND (h->>'avg_s')::TEXT != 'null'
                    ),
                    min_single_rider_wait_minutes = (
                        SELECT COALESCE(MIN((h->>'avg_s')::NUMERIC), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg_s' IS NOT NULL AND (h->>'avg_s')::TEXT != 'null'
                    ),
                    max_single_rider_wait_minutes = (
                        SELECT COALESCE(MAX((h->>'avg_s')::NUMERIC), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg_s' IS NOT NULL AND (h->>'avg_s')::TEXT != 'null'
                    ),
                    total_data_points = (
                        SELECT COALESCE(SUM((h->>'data')::INTEGER), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'data' IS NOT NULL AND (h->>'data')::TEXT != 'null'
                    ),
                    -- Calculate operational percentage and downtime from operational minutes
                    operational_percentage = (
                        SELECT COALESCE(ROUND((SUM((h->>'op')::INTEGER) * 100.0 / NULLIF(SUM((h->>'data')::INTEGER) * 5, 0))::NUMERIC, 2), 0)::DECIMAL(5,2)
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'op' IS NOT NULL AND (h->>'op')::TEXT != 'null'
                        AND h->>'data' IS NOT NULL AND (h->>'data')::TEXT != 'null'
                    ),
                    downtime_minutes = (
                        SELECT COALESCE(SUM(((h->>'data')::INTEGER * 5) - (h->>'op')::INTEGER), 0)::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'data' IS NOT NULL AND (h->>'data')::TEXT != 'null'
                        AND h->>'op' IS NOT NULL AND (h->>'op')::TEXT != 'null'
                    ),
                    -- Find peak hour (hour with highest average wait time)
                    peak_wait_time_hour = (
                        SELECT (h->>'h')::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg' IS NOT NULL AND (h->>'avg')::TEXT != 'null'
                        ORDER BY (h->>'avg')::NUMERIC DESC, (h->>'max')::NUMERIC DESC
                        LIMIT 1
                    ),
                    peak_wait_time_value = (
                        SELECT (h->>'max')::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg' IS NOT NULL AND (h->>'avg')::TEXT != 'null'
                        ORDER BY (h->>'avg')::NUMERIC DESC, (h->>'max')::NUMERIC DESC
                        LIMIT 1
                    ),
                    -- Find lowest hour (hour with lowest average wait time)
                    lowest_wait_time_hour = (
                        SELECT (h->>'h')::INTEGER
                        FROM jsonb_array_elements(filtered_hourly_data) h
                        WHERE h->>'avg' IS NOT NULL AND (h->>'avg')::TEXT != 'null'
                        ORDER BY (h->>'avg')::NUMERIC ASC, (h->>'min')::NUMERIC ASC
                        LIMIT 1
                    ),
                    updated_at = NOW()
                WHERE id = daily_record.id;
                
                total_updated := total_updated + 1;
            END IF;
            
            -- Log progress every 100 records
            IF total_processed % 100 = 0 THEN
                RAISE NOTICE 'Processed % records, updated % records, errors %', total_processed, total_updated, total_errors;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                total_errors := total_errors + 1;
                RAISE NOTICE 'Error processing record %: %', daily_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Retroactive fix completed. Processed: %, Updated: %, Errors: %', total_processed, total_updated, total_errors;
    
    RETURN QUERY SELECT total_processed, total_updated, total_errors;
END;
$$;
