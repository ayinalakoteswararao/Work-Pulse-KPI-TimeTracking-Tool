DO $$
DECLARE
    goutham_id UUID;
    yugandhar_id UUID;
    goutham_emp_id UUID;
    yugandhar_emp_id UUID;
    manager_role_id UUID;
BEGIN
    SELECT id INTO goutham_id FROM auth.users WHERE email = 'gouthampasunuti88@gmail.com';
    SELECT id INTO yugandhar_id FROM auth.users WHERE email = 'yugandhar@ktl.com';
    
    -- Strip admin from their auth user metadata just in case
    IF goutham_id IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"manager"')
        WHERE id = goutham_id;
        
        SELECT employee_id INTO goutham_emp_id FROM public.user_roles WHERE user_id = goutham_id LIMIT 1;
    END IF;
    
    IF yugandhar_id IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"manager"')
        WHERE id = yugandhar_id;
        
        SELECT employee_id INTO yugandhar_emp_id FROM public.user_roles WHERE user_id = yugandhar_id LIMIT 1;
    END IF;

    -- Update their employee record's role_id so the UI stops saying "Administrator"
    SELECT id INTO manager_role_id FROM public.roles WHERE role_name ILIKE '%manager%' LIMIT 1;

    IF manager_role_id IS NOT NULL THEN
        IF goutham_emp_id IS NOT NULL THEN
            UPDATE public.employees SET role_id = manager_role_id WHERE id = goutham_emp_id;
        END IF;
        
        IF yugandhar_emp_id IS NOT NULL THEN
            UPDATE public.employees SET role_id = manager_role_id WHERE id = yugandhar_emp_id;
        END IF;
    END IF;
END $$;
