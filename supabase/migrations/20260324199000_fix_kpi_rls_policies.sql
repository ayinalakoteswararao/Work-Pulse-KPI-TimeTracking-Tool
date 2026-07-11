-- Fix RLS policies for kpi_performance_logs to handle users without employee_id better
DROP POLICY IF EXISTS "Users can read own performance logs" ON public.kpi_performance_logs;
DROP POLICY IF EXISTS "Users can insert own performance logs" ON public.kpi_performance_logs;
DROP POLICY IF EXISTS "Users can update own performance logs" ON public.kpi_performance_logs;

-- Create more flexible policies that work with or without employee_id
CREATE POLICY "Users can read own performance logs" ON public.kpi_performance_logs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND (
      ur.role = 'admin' OR 
      (ur.role = 'employee' AND (
        ur.employee_id IS NOT NULL AND ur.employee_id = public.kpi_performance_logs.employee_id
      ))
    )
  )
);

CREATE POLICY "Users can insert own performance logs" ON public.kpi_performance_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND (
      ur.role = 'admin' OR 
      (ur.role = 'employee' AND (
        ur.employee_id IS NOT NULL AND ur.employee_id = public.kpi_performance_logs.employee_id
      ))
    )
  )
);

CREATE POLICY "Users can update own performance logs" ON public.kpi_performance_logs FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND (
      ur.role = 'admin' OR 
      (ur.role = 'employee' AND (
        ur.employee_id IS NOT NULL AND ur.employee_id = public.kpi_performance_logs.employee_id
      ))
    )
  )
);

-- Also fix work_sessions policies to ensure employee_id is properly set
DROP POLICY IF EXISTS "Users can read own work sessions" ON public.work_sessions;
CREATE POLICY "Users can read own work sessions" ON public.work_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own work sessions" ON public.work_sessions;
CREATE POLICY "Users can insert own work sessions" ON public.work_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own work sessions" ON public.work_sessions;
CREATE POLICY "Users can update own work sessions" ON public.work_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
