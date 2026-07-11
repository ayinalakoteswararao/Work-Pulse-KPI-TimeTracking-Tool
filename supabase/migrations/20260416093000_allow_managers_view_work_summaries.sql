-- Allow managers to read work summaries for employees in their department.
DROP POLICY IF EXISTS "Managers can view department work summaries" ON public.work_summaries;

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
