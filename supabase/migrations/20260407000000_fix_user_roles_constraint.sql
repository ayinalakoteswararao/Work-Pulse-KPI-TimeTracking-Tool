-- Migration: Fix user_roles role constraint to include manager
-- Created: 2026-04-07

-- Drop existing check constraint and recreate with manager role included
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint that includes manager
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'manager', 'employee'));

-- Also ensure department_id column exists (in case previous migration didn't run)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Create index for department_id if not exists
CREATE INDEX IF NOT EXISTS idx_user_roles_department_id ON public.user_roles(department_id);
