-- Migration: Add department_id to user_roles and support for manager role
-- Created: 2026-03-31

-- Add department_id column to user_roles table
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_department_id ON user_roles(department_id);

-- Update RLS policies to allow managers to see their department's data
-- Policy: Managers can view employees in their department
DROP POLICY IF EXISTS "Managers can view department employees" ON employees;
CREATE POLICY "Managers can view department employees" ON employees
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
      AND user_roles.department_id = employees.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Managers can update employees in their department
DROP POLICY IF EXISTS "Managers can update department employees" ON employees;
CREATE POLICY "Managers can update department employees" ON employees
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
      AND user_roles.department_id = employees.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Managers can view task logs for their department
DROP POLICY IF EXISTS "Managers can view department task logs" ON task_logs;
CREATE POLICY "Managers can view department task logs" ON task_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = task_logs.employee_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'manager'
      AND ur.department_id = e.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'employee'
      AND user_roles.employee_id = task_logs.employee_id
    )
  );

-- Policy: Managers can view KPIs for their department
DROP POLICY IF EXISTS "Managers can view department KPIs" ON kpis;
CREATE POLICY "Managers can view department KPIs" ON kpis
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'manager'
      AND ur.department_id = kpis.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = ur.employee_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'employee'
      AND e.department_id = kpis.department_id
    )
  );

-- Policy: Managers can view work sessions for their department
DROP POLICY IF EXISTS "Managers can view department work sessions" ON work_sessions;
CREATE POLICY "Managers can view department work sessions" ON work_sessions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = work_sessions.employee_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'manager'
      AND ur.department_id = e.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'employee'
      AND user_roles.employee_id = work_sessions.employee_id
    )
  );

-- Add comment explaining the manager role
COMMENT ON COLUMN user_roles.department_id IS 'Department ID for manager role - determines which department the manager has access to';
