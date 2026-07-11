
-- Add missing columns to task_logs table for additional task details
ALTER TABLE public.task_logs 
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS project_client TEXT,
ADD COLUMN IF NOT EXISTS module_handle TEXT;
