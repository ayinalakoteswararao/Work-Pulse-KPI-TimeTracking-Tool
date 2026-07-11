-- KPI System Migration

-- KPI Definitions (created by Admin/Manager)
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  kpi_summary TEXT NOT NULL,
  time_tenure TEXT NOT NULL CHECK (time_tenure IN ('day', 'week', 'month')),
  target_count NUMERIC NOT NULL CHECK (target_count > 0),
  target_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (target_revenue >= 0),
  final_target NUMERIC NOT NULL CHECK (final_target > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(function_id, time_tenure) -- Only one KPI per function + tenure
);
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read kpis" ON public.kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert kpis" ON public.kpis FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update kpis" ON public.kpis FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete kpis" ON public.kpis FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KPI Performance Logs (employee daily work entries)
CREATE TABLE public.kpi_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_count NUMERIC NOT NULL DEFAULT 0 CHECK (actual_count >= 0),
  actual_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (actual_revenue >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kpi_id, employee_id, log_date) -- One entry per KPI per employee per day
);
ALTER TABLE public.kpi_performance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own performance logs" ON public.kpi_performance_logs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.employees e ON e.id = employee_id 
    WHERE ur.user_id = auth.uid() AND (ur.role = 'admin' OR ur.employee_id = employee_id)
  )
);
CREATE POLICY "Users can insert own performance logs" ON public.kpi_performance_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.employees e ON e.id = employee_id 
    WHERE ur.user_id = auth.uid() AND (ur.role = 'admin' OR ur.employee_id = employee_id)
  )
);
CREATE POLICY "Users can update own performance logs" ON public.kpi_performance_logs FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.employees e ON e.id = employee_id 
    WHERE ur.user_id = auth.uid() AND (ur.role = 'admin' OR ur.employee_id = employee_id)
  )
);
CREATE POLICY "Admins can delete performance logs" ON public.kpi_performance_logs FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE TRIGGER update_kpi_performance_logs_updated_at BEFORE UPDATE ON public.kpi_performance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KPI Performance Summary (calculated views for performance tracking)
CREATE TABLE public.kpi_performance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_count NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  count_performance NUMERIC NOT NULL DEFAULT 0, -- percentage
  revenue_performance NUMERIC NOT NULL DEFAULT 0, -- percentage
  final_score NUMERIC NOT NULL DEFAULT 0, -- weighted average
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kpi_id, employee_id, period_start, period_end)
);
ALTER TABLE public.kpi_performance_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read performance summary" ON public.kpi_performance_summary FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_kpi_performance_summary_updated_at BEFORE UPDATE ON public.kpi_performance_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_kpis_department ON public.kpis(department_id);
CREATE INDEX idx_kpis_role ON public.kpis(role_id);
CREATE INDEX idx_kpis_function ON public.kpis(function_id);
CREATE INDEX idx_kpi_performance_logs_kpi ON public.kpi_performance_logs(kpi_id);
CREATE INDEX idx_kpi_performance_logs_employee ON public.kpi_performance_logs(employee_id);
CREATE INDEX idx_kpi_performance_logs_date ON public.kpi_performance_logs(log_date);
CREATE INDEX idx_kpi_performance_summary_kpi ON public.kpi_performance_summary(kpi_id);
CREATE INDEX idx_kpi_performance_summary_employee ON public.kpi_performance_summary(employee_id);

-- Function to calculate KPI performance
CREATE OR REPLACE FUNCTION public.calculate_kpi_performance(
  p_kpi_id UUID,
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  total_count NUMERIC,
  total_revenue NUMERIC,
  count_performance NUMERIC,
  revenue_performance NUMERIC,
  final_score NUMERIC
) AS $$
DECLARE
  v_kpi RECORD;
  v_total_count NUMERIC := 0;
  v_total_revenue NUMERIC := 0;
  v_count_perf NUMERIC := 0;
  v_revenue_perf NUMERIC := 0;
  v_final_score NUMERIC := 0;
BEGIN
  -- Get KPI details
  SELECT * INTO v_kpi FROM public.kpis WHERE id = p_kpi_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate totals from performance logs
  SELECT 
    COALESCE(SUM(actual_count), 0),
    COALESCE(SUM(actual_revenue), 0)
  INTO v_total_count, v_total_revenue
  FROM public.kpi_performance_logs
  WHERE kpi_id = p_kpi_id
    AND employee_id = p_employee_id
    AND log_date >= p_period_start
    AND log_date <= p_period_end;
  
  -- Calculate performance percentages
  IF v_kpi.target_count > 0 THEN
    v_count_perf := (v_total_count / v_kpi.target_count) * 100;
  END IF;
  
  IF v_kpi.target_revenue > 0 THEN
    v_revenue_perf := (v_total_revenue / v_kpi.target_revenue) * 100;
  END IF;
  
  -- Calculate final score (weighted average)
  v_final_score := (v_count_perf * 0.5) + (v_revenue_perf * 0.5);
  
  RETURN QUERY SELECT v_total_count, v_total_revenue, v_count_perf, v_revenue_perf, v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update performance summary
CREATE OR REPLACE FUNCTION public.update_performance_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert performance summary for the affected KPI and employee
  INSERT INTO public.kpi_performance_summary (
    kpi_id, employee_id, period_start, period_end,
    total_count, total_revenue, count_performance, revenue_performance, final_score
  )
  SELECT 
    NEW.kpi_id,
    NEW.employee_id,
    CASE 
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'day' THEN NEW.log_date
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'week' THEN date_trunc('week', NEW.log_date)::DATE
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'month' THEN date_trunc('month', NEW.log_date)::DATE
    END,
    CASE 
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'day' THEN NEW.log_date
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'week' THEN (date_trunc('week', NEW.log_date) + INTERVAL '6 days')::DATE
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'month' THEN (date_trunc('month', NEW.log_date) + INTERVAL '1 month - 1 day')::DATE
    END,
    total_count,
    total_revenue,
    count_performance,
    revenue_performance,
    final_score
  FROM public.calculate_kpi_performance(
    NEW.kpi_id,
    NEW.employee_id,
    CASE 
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'day' THEN NEW.log_date
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'week' THEN date_trunc('week', NEW.log_date)::DATE
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'month' THEN date_trunc('month', NEW.log_date)::DATE
    END,
    CASE 
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'day' THEN NEW.log_date
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'week' THEN (date_trunc('week', NEW.log_date) + INTERVAL '6 days')::DATE
      WHEN (SELECT time_tenure FROM public.kpis WHERE id = NEW.kpi_id) = 'month' THEN (date_trunc('month', NEW.log_date) + INTERVAL '1 month - 1 day')::DATE
    END
  )
  ON CONFLICT (kpi_id, employee_id, period_start, period_end)
  DO UPDATE SET
    total_count = EXCLUDED.total_count,
    total_revenue = EXCLUDED.total_revenue,
    count_performance = EXCLUDED.count_performance,
    revenue_performance = EXCLUDED.revenue_performance,
    final_score = EXCLUDED.final_score,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update performance summary
CREATE TRIGGER trigger_update_performance_summary
  AFTER INSERT OR UPDATE ON public.kpi_performance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_performance_summary();
