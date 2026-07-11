-- Migration: Allow managers to create KPIs for their department
-- Created: 2026-04-03

-- Policy: Managers can insert KPIs for their department
DROP POLICY IF EXISTS "Managers can insert department KPIs" ON kpis;
CREATE POLICY "Managers can insert department KPIs" ON kpis
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
      AND user_roles.department_id = kpis.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Managers can update KPIs for their department
DROP POLICY IF EXISTS "Managers can update department KPIs" ON kpis;
CREATE POLICY "Managers can update department KPIs" ON kpis
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
      AND user_roles.department_id = kpis.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Managers can delete KPIs for their department
DROP POLICY IF EXISTS "Managers can delete department KPIs" ON kpis;
CREATE POLICY "Managers can delete department KPIs" ON kpis
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
      AND user_roles.department_id = kpis.department_id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );
