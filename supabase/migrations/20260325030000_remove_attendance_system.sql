-- Remove Attendance System
-- This migration removes all attendance-related functionality

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_auto_calculate_attendance ON public.kpi_performance_logs;
DROP TRIGGER IF EXISTS trigger_calculate_attendance_on_session_end ON public.work_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS public.auto_calculate_attendance();
DROP FUNCTION IF EXISTS public.calculate_attendance_on_session_end();
DROP FUNCTION IF EXISTS public.calculate_attendance_score(UUID);

-- Remove attendance columns from work_sessions table
ALTER TABLE work_sessions 
DROP COLUMN IF EXISTS attendance_calculated,
DROP COLUMN IF EXISTS attendance_score,
DROP COLUMN IF EXISTS kpi_performance_score,
DROP COLUMN IF EXISTS work_hours_score,
DROP COLUMN IF EXISTS attendance_notes;
