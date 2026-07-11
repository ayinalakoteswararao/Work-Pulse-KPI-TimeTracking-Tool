-- Migration to grant Manager access to rohitkakani95@gmail.com for "🤝 Business Development Executive - Sales" department
DO $$
DECLARE
    v_user_id UUID;
    v_emp_id UUID;
    v_dept_id UUID;
BEGIN
    -- 1. Find employee
    SELECT id INTO v_emp_id
    FROM public.employees
    WHERE email = 'rohitkakani95@gmail.com'
    LIMIT 1;

    IF v_emp_id IS NULL THEN
        RAISE EXCEPTION 'Employee with email rohitkakani95@gmail.com not found in the employees table.';
    END IF;

    -- 2. Find user_id from user_roles
    SELECT user_id INTO v_user_id
    FROM public.user_roles
    WHERE employee_id = v_emp_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Employee rohitkakani95@gmail.com has not signed up (has no user_roles entry). Please ask them to sign up/log in once first.';
    END IF;

    -- 2. Find department
    SELECT id INTO v_dept_id
    FROM public.departments
    WHERE name = '🤝 Business Development Executive - Sales'
    LIMIT 1;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Department "🤝 Business Development Executive - Sales" not found.';
    END IF;

    -- 3. Grant the manager role for this department
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'manager' AND department_id = v_dept_id) THEN
        -- Role already exists, do nothing
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
        -- Update their existing role to manager for this department
        UPDATE public.user_roles
        SET role = 'manager', department_id = v_dept_id
        WHERE user_id = v_user_id;
    ELSE
        -- Insert a new manager role if none exists
        INSERT INTO public.user_roles (user_id, role, department_id, employee_id)
        VALUES (v_user_id, 'manager', v_dept_id, v_emp_id);
    END IF;
END $$;
