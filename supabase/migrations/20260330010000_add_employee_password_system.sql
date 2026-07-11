-- Add password tracking and first login functionality for employees
ALTER TABLE public.employees ADD COLUMN password_hash TEXT;
ALTER TABLE public.employees ADD COLUMN first_login BOOLEAN DEFAULT true;
ALTER TABLE public.employees ADD COLUMN password_updated_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX idx_employees_first_login ON public.employees(first_login);

-- Function to verify employee password
CREATE OR REPLACE FUNCTION public.verify_employee_password(employee_code_input TEXT, password_input TEXT)
RETURNS TABLE(employee_id UUID, email TEXT, name TEXT, is_first_login BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.email,
    e.name,
    e.first_login
  FROM public.employees e
  WHERE e.employee_code = employee_code_input
    AND (
      -- Check for default password during first login
      (e.first_login = true AND password_input = '12345678') OR
      -- Check for custom password after first login
      (e.first_login = false AND e.password_hash = crypt(password_input, e.password_hash))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update employee password
CREATE OR REPLACE FUNCTION public.update_employee_password(employee_id_input UUID, new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.employees 
  SET 
    password_hash = crypt(new_password, gen_salt('bf')),
    first_login = false,
    password_updated_at = now()
  WHERE id = employee_id_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for the new functions
CREATE POLICY "Allow password verification for employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow password updates for employees" ON public.employees
  FOR UPDATE TO authenticated USING (true);
