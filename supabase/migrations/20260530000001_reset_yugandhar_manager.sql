-- Forcefully reset Yugandhar's roles to Manager
DO $$
DECLARE
    yugandhar_id UUID;
    first_dept_id UUID;
BEGIN
    SELECT id INTO yugandhar_id FROM auth.users WHERE email = 'yugandhar@ktl.com';
    
    -- Find the first available department as a fallback
    SELECT id INTO first_dept_id FROM public.departments LIMIT 1;
    
    IF yugandhar_id IS NOT NULL THEN
        -- Remove any existing roles (including the accidental admin role)
        DELETE FROM public.user_roles WHERE user_id = yugandhar_id;
        
        -- Insert a fresh manager role
        IF first_dept_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role, department_id)
            VALUES (yugandhar_id, 'manager', first_dept_id);
        ELSE
            INSERT INTO public.user_roles (user_id, role)
            VALUES (yugandhar_id, 'manager');
        END IF;
        
        -- Ensure user metadata is set to manager
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"manager"')
        WHERE id = yugandhar_id;
    END IF;
END $$;
