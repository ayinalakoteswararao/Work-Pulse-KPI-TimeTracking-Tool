-- Allow employees to mark their own reviewed leave notifications as seen.
-- This is required for bell-item click and "mark all read" on employee side.

DROP POLICY IF EXISTS "leave_requests_update_own_employee_seen" ON public.leave_requests;
CREATE POLICY "leave_requests_update_own_employee_seen"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id = leave_requests.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id = leave_requests.employee_id
    )
  );
