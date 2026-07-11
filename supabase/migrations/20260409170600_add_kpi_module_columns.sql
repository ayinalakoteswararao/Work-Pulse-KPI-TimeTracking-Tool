-- Add missing columns to kpis table for project/client and module/handle details
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS project_client TEXT,
ADD COLUMN IF NOT EXISTS module_handle TEXT;
