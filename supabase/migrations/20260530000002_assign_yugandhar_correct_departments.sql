-- Assign Yugandhar to all departments EXCEPT Overseas
DO $$
DECLARE
    yugandhar_id UUID;
    yugandhar_emp_id UUID;
    overseas_dept_id UUID;
    dept RECORD;
BEGIN
    -- Find Yugandhar's user ID
    SELECT id INTO yugandhar_id FROM auth.users WHERE email = 'yugandhar@ktl.com';
    
    IF yugandhar_id IS NOT NULL THEN
        -- Get his employee ID if he has one
        SELECT employee_id INTO yugandhar_emp_id FROM public.user_roles WHERE user_id = yugandhar_id LIMIT 1;
        
        -- Delete all his current roles to start fresh
        DELETE FROM public.user_roles WHERE user_id = yugandhar_id;
        
        -- Find the Overseas department
        SELECT id INTO overseas_dept_id FROM public.departments WHERE name ILIKE '%overseas%' LIMIT 1;
        
        -- If overseas dept exists, assign him to all OTHERS
        IF overseas_dept_id IS NOT NULL THEN
            FOR dept IN SELECT id FROM public.departments WHERE id != overseas_dept_id LOOP
                INSERT INTO public.user_roles (user_id, role, department_id, employee_id)
                VALUES (yugandhar_id, 'manager', dept.id, yugandhar_emp_id);
            END LOOP;
        ELSE
            -- If overseas dept doesn't exist for some reason, assign him to all
            FOR dept IN SELECT id FROM public.departments LOOP
                INSERT INTO public.user_roles (user_id, role, department_id, employee_id)
                VALUES (yugandhar_id, 'manager', dept.id, yugandhar_emp_id);
            END LOOP;
        END IF;
    END IF;
END $$;
