-- Simplify KPI performance logs RLS policies to be more permissive for employees
DROP POLICY IF EXISTS "Users can read own performance logs" ON public.kpi_performance_logs;
DROP POLICY IF EXISTS "Users can insert own performance logs" ON public.kpi_performance_logs;
DROP POLICY IF EXISTS "Users can update own performance logs" ON public.kpi_performance_logs;

-- Simple policies that allow employees to manage their own logs based on email matching
CREATE POLICY "Users can read own performance logs" ON public.kpi_performance_logs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = public.kpi_performance_logs.employee_id 
    AND e.email = auth.email()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can insert own performance logs" ON public.kpi_performance_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = public.kpi_performance_logs.employee_id 
    AND e.email = auth.email()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can update own performance logs" ON public.kpi_performance_logs FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = public.kpi_performance_logs.employee_id 
    AND e.email = auth.email()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);
