-- Attendance Calculation System
-- This links KPI performance to attendance calculation

-- Add attendance calculation to work_sessions
ALTER TABLE work_sessions 
ADD COLUMN attendance_calculated BOOLEAN DEFAULT FALSE,
ADD COLUMN attendance_score NUMERIC DEFAULT 0, -- 0-100 score
ADD COLUMN kpi_performance_score NUMERIC DEFAULT 0, -- KPI performance contribution
ADD COLUMN work_hours_score NUMERIC DEFAULT 0, -- Work hours contribution
ADD COLUMN attendance_notes TEXT;

-- Create attendance calculation function
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
  -- Get work session details
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
  
  -- Generate notes
  v_notes := format('Work Hours: %.1f (%.1f/50), KPI Performance: %.1f (%.1f/50)', 
    COALESCE(v_session.total_hours, 0), 
    v_work_hours_score,
    v_total_kpi_score * 2, -- Convert back to 100 scale for display
    v_total_kpi_score
  );
  
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

-- Create trigger to automatically calculate attendance when KPI logs are updated
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
    attendance_notes = format('Work Hours: %.1f (%.1f/50), KPI Performance: %.1f (%.1f/50)', 
      COALESCE(total_hours, 0), 
      LEAST(50, COALESCE(total_hours, 0) / 8 * 50),
      COALESCE(
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
      ) * 2,
      COALESCE(
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
      )
    ),
    updated_at = now()
  WHERE employee_id = NEW.employee_id 
    AND date = NEW.log_date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic attendance calculation
CREATE TRIGGER trigger_auto_calculate_attendance
  AFTER INSERT OR UPDATE ON public.kpi_performance_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_calculate_attendance();

-- Also calculate attendance when work session ends
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
      attendance_notes = format('Work Hours: %.1f (%.1f/50), KPI Performance: %.1f (%.1f/50)', 
        COALESCE(NEW.total_hours, 0), 
        LEAST(50, COALESCE(NEW.total_hours, 0) / 8 * 50),
        COALESCE(
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
        ) * 2,
        COALESCE(
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
        )
      ),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for attendance calculation on session end
CREATE TRIGGER trigger_calculate_attendance_on_session_end
  AFTER UPDATE ON public.work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_attendance_on_session_end();
