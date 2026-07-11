-- Set up existing employees with default password system
-- This migration ensures all existing employees can login with the default password

-- Update all existing employees to have first_login = true
-- This ensures they will be prompted to change password on first login
UPDATE public.employees 
SET first_login = true 
WHERE first_login IS NULL;

-- Create a function to handle employee login authentication
-- This combines Supabase auth with our custom employee password system
CREATE OR REPLACE FUNCTION public.handle_employee_login(employee_code_input TEXT, password_input TEXT)
RETURNS TABLE(success BOOLEAN, employee_id UUID, email TEXT, name TEXT, is_first_login BOOLEAN, error_message TEXT) AS $$
DECLARE
    employee_record RECORD;
    auth_user RECORD;
BEGIN
    -- Find employee by code
    SELECT id, email, name, first_login INTO employee_record
    FROM public.employees
    WHERE employee_code = employee_code_input;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, false, 'Employee ID not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check password (default password for first login, otherwise check hash)
    IF employee_record.first_login = true THEN
        IF password_input != '12345678' THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, false, 'Invalid password'::TEXT;
            RETURN;
        END IF;
    ELSE
        IF employee_record.password_hash IS NULL OR employee_record.password_hash != crypt(password_input, employee_record.password_hash) THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, false, 'Invalid password'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Return success with employee data
    RETURN QUERY SELECT true, employee_record.id, employee_record.email, employee_record.name, employee_record.first_login, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_employee_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_employee_password TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_password TO authenticated;

-- Create a trigger to automatically set first_login for new employees
CREATE OR REPLACE FUNCTION public.set_employee_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.first_login IS NULL THEN
        NEW.first_login := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_defaults_trigger
    BEFORE INSERT ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_employee_defaults();

-- Add helpful comment
COMMENT ON COLUMN public.employees.first_login IS 'Indicates if this is the employee''s first login and they need to set a new password';
COMMENT ON COLUMN public.employees.password_hash IS 'Hashed password using bcrypt. NULL means using default password.';
