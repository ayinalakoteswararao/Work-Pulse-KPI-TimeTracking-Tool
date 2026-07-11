-- Add salary-related fields to employees (optional, for employee-side salary summary)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC,
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 30;

