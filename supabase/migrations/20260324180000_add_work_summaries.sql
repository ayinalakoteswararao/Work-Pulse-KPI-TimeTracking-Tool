-- Create work_summaries table for end-of-work summaries
CREATE TABLE IF NOT EXISTS work_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies
ALTER TABLE work_summaries ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own summaries
CREATE POLICY "Users can view own work summaries"
  ON work_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own summaries
CREATE POLICY "Users can insert own work summaries"
  ON work_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all work summaries
CREATE POLICY "Admins can view all work summaries"
  ON work_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_summaries_employee_id ON work_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_summaries_work_date ON work_summaries(work_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_summaries_updated_at
  BEFORE UPDATE ON work_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
