-- Hour-based payroll support on employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS standard_hours_per_day NUMERIC DEFAULT 8;

-- Holiday master (admin-managed)
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (holiday_date, department_id)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read holidays" ON public.holidays;
CREATE POLICY "Anyone authenticated can read holidays"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and managers can insert holidays" ON public.holidays;
CREATE POLICY "Admins and managers can insert holidays"
  ON public.holidays
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update holidays" ON public.holidays;
CREATE POLICY "Admins and managers can update holidays"
  ON public.holidays
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can delete holidays" ON public.holidays;
CREATE POLICY "Admins and managers can delete holidays"
  ON public.holidays
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP TRIGGER IF EXISTS update_holidays_updated_at ON public.holidays;
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_department ON public.holidays(department_id);

-- Manual approval/override for day-pay decisions
CREATE TABLE IF NOT EXISTS public.attendance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL,
  attendance_type TEXT NOT NULL CHECK (
    attendance_type IN (
      'full_day',
      'half_day_paid',
      'half_day_unpaid',
      'leave_paid',
      'leave_unpaid',
      'holiday_paid',
      'holiday_unpaid'
    )
  ),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, adjustment_date)
);

ALTER TABLE public.attendance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read attendance adjustments" ON public.attendance_adjustments;
CREATE POLICY "Anyone authenticated can read attendance adjustments"
  ON public.attendance_adjustments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and managers can insert attendance adjustments" ON public.attendance_adjustments;
CREATE POLICY "Admins and managers can insert attendance adjustments"
  ON public.attendance_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update attendance adjustments" ON public.attendance_adjustments;
CREATE POLICY "Admins and managers can update attendance adjustments"
  ON public.attendance_adjustments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can delete attendance adjustments" ON public.attendance_adjustments;
CREATE POLICY "Admins and managers can delete attendance adjustments"
  ON public.attendance_adjustments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP TRIGGER IF EXISTS update_attendance_adjustments_updated_at ON public.attendance_adjustments;
CREATE TRIGGER update_attendance_adjustments_updated_at
  BEFORE UPDATE ON public.attendance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_attendance_adjustments_employee_date
  ON public.attendance_adjustments(employee_id, adjustment_date);

