DO $$
DECLARE
    goutham_id UUID;
    yugandhar_id UUID;
    goutham_emp_id UUID;
    yugandhar_emp_id UUID;
    overseas_dept_id UUID;
    dept RECORD;
BEGIN
    -- 1. Find the User IDs from auth.users
    SELECT id INTO goutham_id FROM auth.users WHERE email = 'gouthampasunuti88@gmail.com';
    SELECT id INTO yugandhar_id FROM auth.users WHERE email = 'yugandhar@ktl.com';
    
    -- 2. Find their employee IDs if they have one already assigned
    IF goutham_id IS NOT NULL THEN
        SELECT employee_id INTO goutham_emp_id FROM public.user_roles WHERE user_id = goutham_id LIMIT 1;
    END IF;
    
    IF yugandhar_id IS NOT NULL THEN
        SELECT employee_id INTO yugandhar_emp_id FROM public.user_roles WHERE user_id = yugandhar_id LIMIT 1;
    END IF;

    -- 3. Find the Overseas department ID
    SELECT id INTO overseas_dept_id FROM public.departments WHERE name ILIKE '%overseas%' LIMIT 1;
    
    -- 4. Update Goutham's role (Overseas manager only)
    IF goutham_id IS NOT NULL AND overseas_dept_id IS NOT NULL THEN
        -- Remove any existing roles for this user
        DELETE FROM public.user_roles WHERE user_id = goutham_id;
        
        -- Insert new manager role for Overseas
        INSERT INTO public.user_roles (user_id, role, department_id, employee_id)
        VALUES (goutham_id, 'manager', overseas_dept_id, goutham_emp_id);
    END IF;
    
    -- 5. Update Yugandhar's role (All departments EXCEPT Overseas)
    IF yugandhar_id IS NOT NULL AND overseas_dept_id IS NOT NULL THEN
        -- Remove any existing roles for this user
        DELETE FROM public.user_roles WHERE user_id = yugandhar_id;
        
        -- Loop through all departments EXCEPT overseas and give manager access
        FOR dept IN SELECT id, name FROM public.departments WHERE id != overseas_dept_id LOOP
            INSERT INTO public.user_roles (user_id, role, department_id, employee_id)
            VALUES (yugandhar_id, 'manager', dept.id, yugandhar_emp_id);
        END LOOP;
    END IF;
END $$;
