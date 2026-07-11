-- Fix existing work sessions that have null employee_id
UPDATE public.work_sessions 
SET employee_id = (
  SELECT e.id 
  FROM public.employees e 
  WHERE e.email = (
    SELECT u.email 
    FROM auth.users u 
    WHERE u.id = public.work_sessions.user_id
  )
)
WHERE employee_id IS NULL;

-- Also update user_roles to link employee_id properly
UPDATE public.user_roles 
SET employee_id = (
  SELECT e.id 
  FROM public.employees e 
  WHERE e.email = (
    SELECT u.email 
    FROM auth.users u 
    WHERE u.id = public.user_roles.user_id
  )
)
WHERE employee_id IS NULL AND role = 'employee';
