-- Ensure read access for work summaries is correct:
-- - Admins: can read all rows
-- - Managers: can read rows of employees in their managed department(s)

DROP POLICY IF EXISTS "Admins can view all work summaries" ON public.work_summaries;
DROP POLICY IF EXISTS "Managers can view department work summaries" ON public.work_summaries;

CREATE POLICY "Admins can view all work summaries"
ON public.work_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE POLICY "Managers can view department work summaries"
ON public.work_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.employees e
      ON e.department_id = ur.department_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
      AND e.id = work_summaries.employee_id
  )
);
