-- Add detailed break tracking columns with start/end times for each break type
ALTER TABLE public.work_sessions
ADD COLUMN IF NOT EXISTS morning_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS morning_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS morning_break_duration NUMERIC DEFAULT 0, -- in minutes
ADD COLUMN IF NOT EXISTS lunch_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_break_duration NUMERIC DEFAULT 0, -- in minutes
ADD COLUMN IF NOT EXISTS short_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS short_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS short_break_duration NUMERIC DEFAULT 0, -- in minutes
ADD COLUMN IF NOT EXISTS break_count INTEGER DEFAULT 0; -- track number of breaks taken

-- Add comments for documentation
COMMENT ON COLUMN public.work_sessions.morning_break_start IS 'Start time of morning break (first break)';
COMMENT ON COLUMN public.work_sessions.morning_break_end IS 'End time of morning break';
COMMENT ON COLUMN public.work_sessions.morning_break_duration IS 'Duration of morning break in minutes';
COMMENT ON COLUMN public.work_sessions.lunch_break_start IS 'Start time of lunch break (second break)';
COMMENT ON COLUMN public.work_sessions.lunch_break_end IS 'End time of lunch break';
COMMENT ON COLUMN public.work_sessions.lunch_break_duration IS 'Duration of lunch break in minutes';
COMMENT ON COLUMN public.work_sessions.short_break_start IS 'Start time of short/evening break (third break)';
COMMENT ON COLUMN public.work_sessions.short_break_end IS 'End time of short/evening break';
COMMENT ON COLUMN public.work_sessions.short_break_duration IS 'Duration of short/evening break in minutes';
COMMENT ON COLUMN public.work_sessions.break_count IS 'Number of breaks taken today (max 3)';

-- Update the calculate_work_hours function to handle multiple breaks
CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS TRIGGER AS $$
DECLARE
    total_break_mins NUMERIC := 0;
BEGIN
    -- Calculate individual break durations
    IF NEW.morning_break_start IS NOT NULL AND NEW.morning_break_end IS NOT NULL THEN
        NEW.morning_break_duration = EXTRACT(EPOCH FROM (NEW.morning_break_end - NEW.morning_break_start)) / 60;
        total_break_mins = total_break_mins + NEW.morning_break_duration;
    END IF;
    
    IF NEW.lunch_break_start IS NOT NULL AND NEW.lunch_break_end IS NOT NULL THEN
        NEW.lunch_break_duration = EXTRACT(EPOCH FROM (NEW.lunch_break_end - NEW.lunch_break_start)) / 60;
        total_break_mins = total_break_mins + NEW.lunch_break_duration;
    END IF;
    
    IF NEW.short_break_start IS NOT NULL AND NEW.short_break_end IS NOT NULL THEN
        NEW.short_break_duration = EXTRACT(EPOCH FROM (NEW.short_break_end - NEW.short_break_start)) / 60;
        total_break_mins = total_break_mins + NEW.short_break_duration;
    END IF;
    
    -- Update total break duration (sum of all breaks)
    NEW.break_duration = total_break_mins;
    
    -- Legacy: Calculate break duration from old fields if new fields not used
    IF NEW.break_start_time IS NOT NULL AND NEW.break_end_time IS NOT NULL THEN
        NEW.break_duration = EXTRACT(EPOCH FROM (NEW.break_end_time - NEW.break_start_time)) / 60;
    END IF;
    
    -- Calculate total hours if start and end times are set
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600; -- in hours
        
        -- Subtract break duration
        IF NEW.break_duration IS NOT NULL THEN
            NEW.total_hours = NEW.total_hours - (NEW.break_duration / 60);
        END IF;
        
        -- Calculate overtime (beyond 9 hours standard workday)
        IF NEW.total_hours > 9 THEN
            NEW.overtime_hours = NEW.total_hours - 9;
        ELSE
            NEW.overtime_hours = 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to determine which break type to use based on break count
CREATE OR REPLACE FUNCTION public.get_next_break_type(p_user_id UUID, p_date DATE)
RETURNS TEXT AS $$
DECLARE
    current_count INTEGER;
    current_status TEXT;
BEGIN
    -- Get current break count and status
    SELECT 
        COALESCE(break_count, 0),
        status
    INTO current_count, current_status
    FROM public.work_sessions
    WHERE user_id = p_user_id AND date = p_date;
    
    -- Check if already on break
    IF current_status = 'on_break' THEN
        RETURN 'already_on_break';
    END IF;
    
    -- Check if max breaks reached
    IF current_count >= 3 THEN
        RETURN 'max_breaks_reached';
    END IF;
    
    -- Return next break type based on count
    CASE current_count
        WHEN 0 THEN RETURN 'morning';
        WHEN 1 THEN RETURN 'lunch';
        WHEN 2 THEN RETURN 'short';
        ELSE RETURN 'max_breaks_reached';
    END CASE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to start a break with proper categorization
CREATE OR REPLACE FUNCTION public.start_break(p_user_id UUID, p_date DATE)
RETURNS TABLE (
    break_type TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    next_break TEXT;
    session_id UUID;
BEGIN
    -- Get next break type
    next_break := public.get_next_break_type(p_user_id, p_date);
    
    -- Check constraints
    IF next_break = 'already_on_break' THEN
        RETURN QUERY SELECT 'error'::TEXT, FALSE, 'You are already on a break'::TEXT;
        RETURN;
    END IF;
    
    IF next_break = 'max_breaks_reached' THEN
        RETURN QUERY SELECT 'error'::TEXT, FALSE, 'Maximum 3 breaks allowed per day'::TEXT;
        RETURN;
    END IF;
    
    -- Get session ID
    SELECT id INTO session_id
    FROM public.work_sessions
    WHERE user_id = p_user_id AND date = p_date;
    
    IF session_id IS NULL THEN
        RETURN QUERY SELECT 'error'::TEXT, FALSE, 'No active work session found'::TEXT;
        RETURN;
    END IF;
    
    -- Update appropriate break columns based on type
    CASE next_break
        WHEN 'morning' THEN
            UPDATE public.work_sessions
            SET morning_break_start = NOW(),
                morning_break = TRUE,
                break_count = break_count + 1,
                status = 'on_break'
            WHERE id = session_id;
        WHEN 'lunch' THEN
            UPDATE public.work_sessions
            SET lunch_break_start = NOW(),
                lunch_break = TRUE,
                break_count = break_count + 1,
                status = 'on_break'
            WHERE id = session_id;
        WHEN 'short' THEN
            UPDATE public.work_sessions
            SET short_break_start = NOW(),
                short_break = TRUE,
                break_count = break_count + 1,
                status = 'on_break'
            WHERE id = session_id;
    END CASE;
    
    RETURN QUERY SELECT next_break, TRUE, 'Break started successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to end a break
CREATE OR REPLACE FUNCTION public.end_break(p_user_id UUID, p_date DATE)
RETURNS TABLE (
    break_type TEXT,
    duration_mins NUMERIC,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    session_record public.work_sessions%ROWTYPE;
    ended_break_type TEXT;
    ended_duration NUMERIC;
BEGIN
    -- Get current session
    SELECT * INTO session_record
    FROM public.work_sessions
    WHERE user_id = p_user_id AND date = p_date;
    
    IF session_record.id IS NULL THEN
        RETURN QUERY SELECT 'error'::TEXT, 0::NUMERIC, FALSE, 'No active work session found'::TEXT;
        RETURN;
    END IF;
    
    IF session_record.status != 'on_break' THEN
        RETURN QUERY SELECT 'error'::TEXT, 0::NUMERIC, FALSE, 'Not currently on a break'::TEXT;
        RETURN;
    END IF;
    
    -- Determine which break is active and end it
    IF session_record.morning_break_start IS NOT NULL AND session_record.morning_break_end IS NULL THEN
        ended_duration := EXTRACT(EPOCH FROM (NOW() - session_record.morning_break_start)) / 60;
        UPDATE public.work_sessions
        SET morning_break_end = NOW(),
            morning_break_duration = ended_duration,
            status = 'working'
        WHERE id = session_record.id;
        ended_break_type := 'morning';
        
    ELSIF session_record.lunch_break_start IS NOT NULL AND session_record.lunch_break_end IS NULL THEN
        ended_duration := EXTRACT(EPOCH FROM (NOW() - session_record.lunch_break_start)) / 60;
        UPDATE public.work_sessions
        SET lunch_break_end = NOW(),
            lunch_break_duration = ended_duration,
            status = 'working'
        WHERE id = session_record.id;
        ended_break_type := 'lunch';
        
    ELSIF session_record.short_break_start IS NOT NULL AND session_record.short_break_end IS NULL THEN
        ended_duration := EXTRACT(EPOCH FROM (NOW() - session_record.short_break_start)) / 60;
        UPDATE public.work_sessions
        SET short_break_end = NOW(),
            short_break_duration = ended_duration,
            status = 'working'
        WHERE id = session_record.id;
        ended_break_type := 'short';
        
    ELSE
        RETURN QUERY SELECT 'error'::TEXT, 0::NUMERIC, FALSE, 'No active break found'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT ended_break_type, ended_duration, TRUE, 'Break ended successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SET search_path = public;
