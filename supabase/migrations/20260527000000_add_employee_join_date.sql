-- Add join_date column to employees table
ALTER TABLE public.employees ADD COLUMN join_date DATE DEFAULT CURRENT_DATE;

-- Backfill existing employees
UPDATE public.employees SET join_date = created_at::DATE;
