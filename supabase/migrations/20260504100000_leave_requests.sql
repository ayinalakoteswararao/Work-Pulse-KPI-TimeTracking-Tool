-- Employee leave requests: pending until admin/manager approves; approval writes attendance_adjustments for payroll.

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  attendance_type TEXT NOT NULL CHECK (
    attendance_type IN (
      'half_day_paid',
      'half_day_unpaid',
      'leave_paid',
      'leave_unpaid'
    )
  ),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leave_requests_one_pending_per_employee_date
  ON public.leave_requests (employee_id, leave_date)
  WHERE (status = 'pending');

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_select_admin" ON public.leave_requests;
CREATE POLICY "leave_requests_select_admin"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "leave_requests_select_manager_dept" ON public.leave_requests;
CREATE POLICY "leave_requests_select_manager_dept"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.employees e ON e.id = leave_requests.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.department_id IS NOT NULL
        AND e.department_id = ur.department_id
    )
  );

DROP POLICY IF EXISTS "leave_requests_select_own" ON public.leave_requests;
CREATE POLICY "leave_requests_select_own"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.employee_id = leave_requests.employee_id
    )
  );

DROP POLICY IF EXISTS "leave_requests_insert_own_pending" ON public.leave_requests;
CREATE POLICY "leave_requests_insert_own_pending"
  ON public.leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.employee_id = leave_requests.employee_id
    )
  );

DROP POLICY IF EXISTS "leave_requests_update_admin_manager" ON public.leave_requests;
CREATE POLICY "leave_requests_update_admin_manager"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.employees e ON e.id = leave_requests.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.department_id IS NOT NULL
        AND e.department_id = ur.department_id
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "leave_requests_delete_own_pending" ON public.leave_requests;
CREATE POLICY "leave_requests_delete_own_pending"
  ON public.leave_requests
  FOR DELETE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.employee_id = leave_requests.employee_id
    )
  );

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
