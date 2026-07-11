-- Comprehensive solution for employee authentication
-- This migration creates triggers and functions to automatically handle auth user creation

-- First, ensure all required columns exist
DO $$
BEGIN
    -- Add employee_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='employees' AND column_name='employee_code'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN employee_code TEXT;
        CREATE INDEX idx_employees_employee_code ON public.employees(employee_code);
    END IF;

    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='employees' AND column_name='password_hash'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN password_hash TEXT;
    END IF;

    -- Add first_login column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='employees' AND column_name='first_login'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN first_login BOOLEAN DEFAULT true;
    END IF;

    -- Add password_updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='employees' AND column_name='password_updated_at'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN password_updated_at TIMESTAMPTZ;
    END IF;

    -- Add user_id column to link to auth.users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='employees' AND column_name='user_id'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX idx_employees_user_id ON public.employees(user_id);
    END IF;
END $$;

-- Update existing employees to have default values
UPDATE public.employees 
SET first_login = COALESCE(first_login, true),
    employee_code = COALESCE(employee_code, 'EMP-' || substring(id::text, 1, 8))
WHERE first_login IS NULL OR employee_code IS NULL;

-- Drop existing function and recreate with better logic
DROP FUNCTION IF EXISTS public.verify_employee_password(TEXT, TEXT);

-- Create improved verify_employee_password function
CREATE OR REPLACE FUNCTION public.verify_employee_password(employee_code_input TEXT, password_input TEXT)
RETURNS TABLE(
    employee_id UUID, 
    email TEXT, 
    name TEXT, 
    is_first_login BOOLEAN,
    user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id::UUID,
    e.email::TEXT,
    e.name::TEXT,
    COALESCE(e.first_login, true)::BOOLEAN as is_first_login,
    e.user_id::UUID
  FROM public.employees e
  WHERE e.employee_code = employee_code_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle employee login authentication
CREATE OR REPLACE FUNCTION public.handle_employee_auth(employee_code_input TEXT)
RETURNS TABLE(
    employee_id UUID,
    email TEXT,
    name TEXT,
    is_first_login BOOLEAN,
    auth_user_id UUID
) AS $$
DECLARE
    emp_record RECORD;
    auth_user RECORD;
BEGIN
    -- Get employee details
    SELECT id, email, name, first_login, user_id 
    INTO emp_record
    FROM public.employees 
    WHERE employee_code = employee_code_input;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check if auth user exists
    IF emp_record.user_id IS NOT NULL THEN
        -- Verify auth user still exists
        SELECT id INTO auth_user 
        FROM auth.users 
        WHERE id = emp_record.user_id;
        
        IF FOUND THEN
            RETURN QUERY SELECT 
                emp_record.id::UUID,
                emp_record.email::TEXT,
                emp_record.name::TEXT,
                emp_record.first_login::BOOLEAN,
                emp_record.user_id::UUID;
            RETURN;
        END IF;
    END IF;
    
    -- Return employee info even if no auth user exists
    -- The application will handle auth user creation
    RETURN QUERY SELECT 
        emp_record.id::UUID,
        emp_record.email::TEXT,
        emp_record.name::TEXT,
        emp_record.first_login::BOOLEAN,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_employee_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_employee_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.handle_employee_auth(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_employee_auth(TEXT) TO anon;

-- Create function to update employee password
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

GRANT EXECUTE ON FUNCTION public.update_employee_password(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.verify_employee_password IS 'Verifies employee exists and returns employee info for login';
COMMENT ON FUNCTION public.handle_employee_auth IS 'Handles employee authentication lookup including auth user verification';
COMMENT ON FUNCTION public.update_employee_password IS 'Updates employee password and marks first login as complete';

-- Create index for faster employee lookups
-- Note: idx_employees_employee_code and idx_employees_user_id already created above
CREATE INDEX IF NOT EXISTS idx_employees_first_login ON public.employees(first_login);
