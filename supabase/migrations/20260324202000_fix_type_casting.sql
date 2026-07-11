-- Fix type casting issues in attendance calculation triggers
-- Ensure proper numeric operations by casting TEXT to NUMERIC where needed

-- Update the auto_calculate_attendance function
CREATE OR REPLACE FUNCTION public.auto_calculate_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Find today's work session for this employee
  UPDATE public.work_sessions 
  SET 
    attendance_calculated = TRUE,
    attendance_score = 
      LEAST(50, COALESCE(total_hours, 0) / 8 * 50) + -- Work hours contribution
      LEAST(50, COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.log_date
            AND k.time_tenure = 'day'
        ), 0
      )), -- KPI performance contribution
    kpi_performance_score = COALESCE(
      (
        SELECT AVG(
          CASE 
            WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
            ELSE 0
          END
        )
        FROM public.kpi_performance_logs kl
        JOIN public.kpis k ON kl.kpi_id = k.id
        WHERE kl.employee_id = NEW.employee_id
          AND kl.log_date = NEW.log_date
          AND k.time_tenure = 'day'
      ), 0
    ),
    work_hours_score = LEAST(50, COALESCE(total_hours, 0) / 8 * 50),
    attendance_notes = 'Work Hours: ' || COALESCE(total_hours, 0)::TEXT || ' (' || LEAST(50, COALESCE(total_hours, 0) / 8 * 50)::TEXT || '/50), KPI Performance: ' || (COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.log_date
            AND k.time_tenure = 'day'
        ), 0
      ) * 2)::TEXT || ' (' || COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.log_date
            AND k.time_tenure = 'day'
        ), 0
      )::TEXT || '/50)',
    updated_at = now()
  WHERE employee_id = NEW.employee_id 
    AND date = NEW.log_date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the calculate_attendance_on_session_end function
CREATE OR REPLACE FUNCTION public.calculate_attendance_on_session_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate when session is being ended (status changes to completed/incomplete)
  IF OLD.status IN ('pending', 'working', 'on_break') 
     AND NEW.status IN ('completed', 'incomplete') THEN
    
    UPDATE public.work_sessions 
    SET 
      attendance_calculated = TRUE,
      attendance_score = 
        LEAST(50, COALESCE(NEW.total_hours, 0) / 8 * 50) + -- Work hours contribution
        LEAST(50, COALESCE(
          (
            SELECT AVG(
              CASE 
                WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
                ELSE 0
              END
            )
            FROM public.kpi_performance_logs kl
            JOIN public.kpis k ON kl.kpi_id = k.id
            WHERE kl.employee_id = NEW.employee_id
              AND kl.log_date = NEW.date
              AND k.time_tenure = 'day'
          ), 0
        )), -- KPI performance contribution
      kpi_performance_score = COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.date
            AND k.time_tenure = 'day'
        ), 0
      ),
      work_hours_score = LEAST(50, COALESCE(NEW.total_hours, 0) / 8 * 50),
      attendance_notes = 'Work Hours: ' || COALESCE(NEW.total_hours, 0)::TEXT || ' (' || LEAST(50, COALESCE(NEW.total_hours, 0) / 8 * 50)::TEXT || '/50), KPI Performance: ' || (COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.date
            AND k.time_tenure = 'day'
        ), 0
      ) * 2)::TEXT || ' (' || COALESCE(
        (
          SELECT AVG(
            CASE 
              WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
              ELSE 0
            END
          )
          FROM public.kpi_performance_logs kl
          JOIN public.kpis k ON kl.kpi_id = k.id
          WHERE kl.employee_id = NEW.employee_id
            AND kl.log_date = NEW.date
            AND k.time_tenure = 'day'
        ), 0
      )::TEXT || '/50)',
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the calculate_attendance_score function
CREATE OR REPLACE FUNCTION public.calculate_attendance_score(
  p_work_session_id UUID
)
RETURNS TABLE (
  attendance_score NUMERIC,
  kpi_performance_score NUMERIC,
  work_hours_score NUMERIC,
  attendance_notes TEXT
) AS $$
DECLARE
  v_session RECORD;
  v_total_kpi_score NUMERIC := 0;
  v_work_hours_score NUMERIC := 0;
  v_final_attendance_score NUMERIC := 0;
  v_notes TEXT := '';
  v_kpi_count INTEGER := 0;
BEGIN
  -- Get KPI details
  SELECT * INTO v_session 
  FROM public.work_sessions 
  WHERE id = p_work_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work session not found';
  END IF;
  
  -- Calculate work hours score (50% weight)
  -- Full score (50) for 8+ hours, proportional for less
  IF v_session.total_hours IS NOT NULL THEN
    IF v_session.total_hours >= 8 THEN
      v_work_hours_score := 50;
    ELSE
      v_work_hours_score := (v_session.total_hours / 8) * 50;
    END IF;
  END IF;
  
  -- Calculate KPI performance score (50% weight)
  -- Get today's KPI performance logs for this employee
  SELECT 
    COALESCE(AVG(
      CASE 
        WHEN k.target_count > 0 THEN (kl.actual_count::NUMERIC / k.target_count) * 100
        ELSE 0
      END
    ), 0)
  INTO v_total_kpi_score
  FROM public.kpi_performance_logs kl
  JOIN public.kpis k ON kl.kpi_id = k.id
  WHERE kl.employee_id = v_session.employee_id
    AND kl.log_date = v_session.date
    AND k.time_tenure = 'day';
  
  -- Cap KPI score at 50 (50% weight)
  v_total_kpi_score := LEAST(v_total_kpi_score, 50);
  
  -- Calculate final attendance score
  v_final_attendance_score := v_work_hours_score + v_total_kpi_score;
  
  -- Generate notes with proper escaping
  v_notes := 'Work Hours: ' || COALESCE(v_session.total_hours, 0)::TEXT || ' (' || v_work_hours_score::TEXT || '/50), KPI Performance: ' || (v_total_kpi_score * 2)::TEXT || ' (' || v_total_kpi_score::TEXT || '/50)';
  
  -- Update work session with calculated scores
  UPDATE public.work_sessions 
  SET 
    attendance_calculated = TRUE,
    attendance_score = v_final_attendance_score,
    kpi_performance_score = v_total_kpi_score,
    work_hours_score = v_work_hours_score,
    attendance_notes = v_notes,
    updated_at = now()
  WHERE id = p_work_session_id;
  
  RETURN QUERY SELECT v_final_attendance_score, v_total_kpi_score, v_work_hours_score, v_notes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
