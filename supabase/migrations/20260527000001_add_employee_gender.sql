-- Add gender column to employees table
ALTER TABLE public.employees ADD COLUMN gender VARCHAR(20) DEFAULT 'unspecified';
