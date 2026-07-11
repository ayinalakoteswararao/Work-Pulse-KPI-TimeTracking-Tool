-- Cap KPI count/revenue performance at 100% so placeholder target_count (e.g. 1)
-- does not produce scores like 1000% when actual_count is 10.

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
  SELECT * INTO v_kpi FROM public.kpis WHERE id = p_kpi_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(actual_count), 0),
    COALESCE(SUM(actual_revenue), 0)
  INTO v_total_count, v_total_revenue
  FROM public.kpi_performance_logs
  WHERE kpi_id = p_kpi_id
    AND employee_id = p_employee_id
    AND log_date >= p_period_start
    AND log_date <= p_period_end;

  IF v_kpi.target_count > 0 THEN
    v_count_perf := LEAST(100::NUMERIC, (v_total_count / v_kpi.target_count) * 100);
  END IF;

  IF v_kpi.target_revenue > 0 THEN
    v_revenue_perf := LEAST(100::NUMERIC, (v_total_revenue / v_kpi.target_revenue) * 100);
  END IF;

  IF (v_kpi.target_count > 0) AND (v_kpi.target_revenue > 0) THEN
    v_final_score := (v_count_perf * 0.5) + (v_revenue_perf * 0.5);
  ELSIF v_kpi.target_count > 0 THEN
    v_final_score := v_count_perf;
  ELSIF v_kpi.target_revenue > 0 THEN
    v_final_score := v_revenue_perf;
  ELSE
    v_final_score := 0;
  END IF;

  RETURN QUERY SELECT v_total_count, v_total_revenue, v_count_perf, v_revenue_perf, v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recompute stored summaries so existing rows reflect the cap
-- (Use a subquery: UPDATE target may not be referenced inside FROM LATERAL in PostgreSQL.)
UPDATE public.kpi_performance_summary s
SET
  total_count = d.total_count,
  total_revenue = d.total_revenue,
  count_performance = d.count_performance,
  revenue_performance = d.revenue_performance,
  final_score = d.final_score,
  updated_at = now()
FROM (
  SELECT
    s2.kpi_id,
    s2.employee_id,
    s2.period_start,
    s2.period_end,
    c.total_count,
    c.total_revenue,
    c.count_performance,
    c.revenue_performance,
    c.final_score
  FROM public.kpi_performance_summary s2
  CROSS JOIN LATERAL public.calculate_kpi_performance(
    s2.kpi_id,
    s2.employee_id,
    s2.period_start,
    s2.period_end
  ) AS c
) d
WHERE s.kpi_id = d.kpi_id
  AND s.employee_id = d.employee_id
  AND s.period_start = d.period_start
  AND s.period_end = d.period_end;
