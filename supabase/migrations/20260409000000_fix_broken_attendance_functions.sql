-- Fix broken attendance functions that reference removed columns
-- This migration cleans up functions that still reference attendance columns
-- that were removed in migration 20260325030000_remove_attendance_system.sql

-- Drop the broken functions that reference non-existent columns
DROP FUNCTION IF EXISTS public.auto_calculate_attendance() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_attendance_on_session_end() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_attendance_score(UUID) CASCADE;

-- Note: The attendance-related columns were removed in migration 20260325030000_remove_attendance_system.sql
-- so any functions that reference them will cause errors
-- The work_sessions table now only contains the original columns:
-- id, user_id, employee_id, date, start_time, break_start_time, break_end_time, 
-- end_time, total_hours, break_duration, status, late_login, overtime_hours, 
-- notes, created_at, updated_at
