-- Add work_summary_id foreign key to work_sessions table
ALTER TABLE work_sessions 
ADD COLUMN work_summary_id uuid REFERENCES work_summaries(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_sessions_summary_id ON work_sessions(work_summary_id);

-- Update RLS policy to allow admins to see the summary relationship
DROP POLICY IF EXISTS "Admins can read all work sessions" ON public.work_sessions;
CREATE POLICY "Admins can read all work sessions" ON public.work_sessions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to get work session with summary
CREATE OR REPLACE FUNCTION public.get_work_session_with_summary(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  employee_id UUID,
  date DATE,
  start_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_hours NUMERIC,
  break_duration NUMERIC,
  status TEXT,
  late_login BOOLEAN,
  overtime_hours NUMERIC,
  notes TEXT,
  work_summary_id UUID,
  summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.user_id,
    ws.employee_id,
    ws.date,
    ws.start_time,
    ws.break_start_time,
    ws.break_end_time,
    ws.end_time,
    ws.total_hours,
    ws.break_duration,
    ws.status,
    ws.late_login,
    ws.overtime_hours,
    ws.notes,
    ws.work_summary_id,
    wsum.summary
  FROM public.work_sessions ws
  LEFT JOIN public.work_summaries wsum ON ws.work_summary_id = wsum.id
  WHERE ws.user_id = p_user_id 
  AND ws.date = p_date
  ORDER BY ws.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SET search_path = public;
