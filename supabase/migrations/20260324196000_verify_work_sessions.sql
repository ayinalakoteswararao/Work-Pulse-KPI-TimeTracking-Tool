-- Verify work_sessions table structure and add any missing columns
DO $$
BEGIN
    -- Check if work_sessions table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_sessions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'work_sessions table does not exist';
    END IF;
    
    -- Check if required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_sessions' AND column_name = 'id') THEN
        RAISE EXCEPTION 'id column missing in work_sessions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_sessions' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'user_id column missing in work_sessions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_sessions' AND column_name = 'date') THEN
        RAISE EXCEPTION 'date column missing in work_sessions';
    END IF;
    
    -- Log success
    RAISE NOTICE 'work_sessions table structure verified successfully';
END $$;

-- Create a simple test function to verify access
CREATE OR REPLACE FUNCTION test_work_sessions_access(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    date DATE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.id,
        ws.user_id,
        ws.date,
        ws.status
    FROM public.work_sessions ws
    WHERE ws.user_id = p_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
