/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE */

DECLARE
    park_timezone TEXT;
    local_check_time TIMESTAMPTZ;
    local_date DATE;
    opening_hours RECORD;
    local_check_time_only TIME;
    opening_time_only TIME;
    closing_time_only TIME;
    opening_datetime TIMESTAMPTZ;
    closing_datetime TIMESTAMPTZ;
BEGIN
    -- Get park timezone
    SELECT timezone INTO park_timezone
    FROM parks 
    WHERE id = p_park_id AND is_active = true;
    
    IF park_timezone IS NULL THEN
        RETURN FALSE; -- Park not found or inactive
    END IF;
    
    -- Convert check time to park's local timezone
    local_check_time := p_check_time AT TIME ZONE 'UTC' AT TIME ZONE park_timezone;
    local_date := DATE(local_check_time);
    
    -- Get today's operating hours (prefer OPERATING type)
    SELECT opening_time, closing_time 
    INTO opening_hours
    FROM park_operating_hours
    WHERE park_id = p_park_id 
    AND date = local_date
    AND type = 'OPERATING'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no OPERATING hours found, try any type
    IF opening_hours IS NULL THEN
        SELECT opening_time, closing_time 
        INTO opening_hours
        FROM park_operating_hours
        WHERE park_id = p_park_id 
        AND date = local_date
        ORDER BY 
            CASE type 
                WHEN 'OPERATING' THEN 1 
                WHEN 'EXTRA_HOURS' THEN 2 
                ELSE 3 
            END,
            created_at DESC
        LIMIT 1;
    END IF;
    
    -- If no hours found, assume closed
    IF opening_hours IS NULL OR opening_hours.opening_time IS NULL OR opening_hours.closing_time IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Convert opening and closing times to timestamptz in park timezone
    opening_datetime := opening_hours.opening_time::TIMESTAMPTZ AT TIME ZONE park_timezone;
    closing_datetime := opening_hours.closing_time::TIMESTAMPTZ AT TIME ZONE park_timezone;
    
    -- Extract time components for comparison
    local_check_time_only := local_check_time::TIME;
    opening_time_only := opening_datetime::TIME;
    closing_time_only := closing_datetime::TIME;
    
    -- Handle case where closing time is after midnight (next day)
    IF closing_time_only < opening_time_only THEN
        -- Park is open past midnight
        RETURN (local_check_time_only >= opening_time_only OR local_check_time_only <= closing_time_only);
    ELSE
        -- Normal same-day operation
        RETURN (local_check_time_only >= opening_time_only AND local_check_time_only <= closing_time_only);
    END IF;
END;