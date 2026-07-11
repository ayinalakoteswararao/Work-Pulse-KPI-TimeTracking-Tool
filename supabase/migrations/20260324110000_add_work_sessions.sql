-- Work Sessions Table
CREATE TABLE public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_hours NUMERIC,
  break_duration NUMERIC, -- in minutes
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'on_break', 'completed', 'incomplete')),
  late_login BOOLEAN DEFAULT FALSE,
  overtime_hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one session per user per day
  UNIQUE(user_id, date)
);

-- Add RLS policies
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own work sessions" ON public.work_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own work sessions" ON public.work_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own work sessions" ON public.work_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all work sessions" ON public.work_sessions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all work sessions" ON public.work_sessions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_work_sessions_updated_at BEFORE UPDATE ON public.work_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_work_sessions_user ON public.work_sessions(user_id);
CREATE INDEX idx_work_sessions_employee ON public.work_sessions(employee_id);
CREATE INDEX idx_work_sessions_date ON public.work_sessions(date);
CREATE INDEX idx_work_sessions_status ON public.work_sessions(status);

-- Function to calculate total hours automatically
CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate break duration if break times are set
  IF NEW.break_start_time IS NOT NULL AND NEW.break_end_time IS NOT NULL THEN
    NEW.break_duration = EXTRACT(EPOCH FROM (NEW.break_end_time - NEW.break_start_time)) / 60; -- in minutes
  END IF;
  
  -- Calculate total hours if start and end times are set
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600; -- in hours
    
    -- Subtract break duration if it exists
    IF NEW.break_duration IS NOT NULL THEN
      NEW.total_hours = NEW.total_hours - (NEW.break_duration / 60);
    END IF;
    
    -- Calculate overtime (beyond 9 hours standard workday)
    IF NEW.total_hours > 9 THEN
      NEW.overtime_hours = NEW.total_hours - 9;
    ELSE
      NEW.overtime_hours = 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic calculations
CREATE TRIGGER calculate_work_session_hours 
  BEFORE INSERT OR UPDATE ON public.work_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.calculate_work_hours();

-- Function to check if user can start work (only at or after 9 AM)
CREATE OR REPLACE FUNCTION public.can_start_work(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user already has a session for today
  IF EXISTS (SELECT 1 FROM public.work_sessions WHERE user_id = p_user_id AND date = p_date) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is after 9 AM (only for today)
  IF p_date = CURRENT_DATE THEN
    IF CURRENT_TIME < TIME '09:00:00' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to get current work session status for a user
CREATE OR REPLACE FUNCTION public.get_current_work_session(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  date DATE,
  start_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_hours NUMERIC,
  break_duration NUMERIC,
  status TEXT,
  late_login BOOLEAN,
  overtime_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.date,
    ws.start_time,
    ws.break_start_time,
    ws.break_end_time,
    ws.end_time,
    ws.total_hours,
    ws.break_duration,
    ws.status,
    ws.late_login,
    ws.overtime_hours
  FROM public.work_sessions ws
  WHERE ws.user_id = p_user_id 
  AND ws.date = CURRENT_DATE
  ORDER BY ws.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SET search_path = public;
