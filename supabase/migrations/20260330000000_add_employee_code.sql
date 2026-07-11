-- Add employee_code column to employees table
ALTER TABLE public.employees ADD COLUMN employee_code TEXT UNIQUE NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_employees_employee_code ON public.employees(employee_code);
