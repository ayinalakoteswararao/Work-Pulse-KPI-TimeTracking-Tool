-- Add separate break type columns for morning, lunch, and short breaks
ALTER TABLE public.work_sessions
ADD COLUMN IF NOT EXISTS morning_break BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lunch_break BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS short_break BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.work_sessions.morning_break IS 'Whether employee took morning break';
COMMENT ON COLUMN public.work_sessions.lunch_break IS 'Whether employee took lunch break';
COMMENT ON COLUMN public.work_sessions.short_break IS 'Whether employee took short break';
