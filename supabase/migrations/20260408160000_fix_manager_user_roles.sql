-- Migration: Fix manager user_roles to use correct auth user IDs
-- Created: 2026-04-08
-- Issue: Hardcoded UUIDs in previous migration don't match actual auth.users IDs

-- ============================================
-- FIX: Update user_roles with correct auth user IDs
-- ============================================

-- Create a function to safely update user_roles for managers
CREATE OR REPLACE FUNCTION fix_manager_user_role(manager_email TEXT, target_role TEXT DEFAULT 'manager')
RETURNS TEXT AS $$
DECLARE
  v_auth_user_id UUID;
  v_employee_id UUID;
  v_current_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- Get the actual auth user ID
  SELECT id INTO v_auth_user_id 
  FROM auth.users 
  WHERE email = manager_email;
  
  IF v_auth_user_id IS NULL THEN
    RETURN 'ERROR: No auth user found for email: ' || manager_email;
  END IF;
  
  -- Get the employee ID
  SELECT id INTO v_employee_id 
  FROM employees 
  WHERE email = manager_email;
  
  IF v_employee_id IS NULL THEN
    RETURN 'ERROR: No employee record found for email: ' || manager_email;
  END IF;
  
  -- Get current user_id from user_roles for this employee
  SELECT user_id INTO v_current_user_id
  FROM user_roles
  WHERE employee_id = v_employee_id
  LIMIT 1;
  
  -- Delete old user_roles entries for this employee that don't match the auth user
  DELETE FROM user_roles 
  WHERE employee_id = v_employee_id 
  AND (user_id != v_auth_user_id OR user_id IS NULL);
  
  -- Get department from employee record
  SELECT department_id INTO v_dept_id
  FROM employees
  WHERE id = v_employee_id;
  
  -- Create new user_roles entry with correct user_id
  INSERT INTO user_roles (user_id, role, employee_id, department_id)
  SELECT v_auth_user_id, target_role, v_employee_id, d.id
  FROM departments d
  WHERE d.id = v_dept_id
  OR (manager_email = 'yugandhar@ktl.com' 
      AND d.name NOT ILIKE '%digital marketing%' 
      AND d.name NOT ILIKE '%overseas%')
  ON CONFLICT (user_id, department_id) DO UPDATE SET
    role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id;
  
  RETURN 'SUCCESS: Updated user_roles for ' || manager_email || ' with auth user ID: ' || v_auth_user_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APPLY FIX FOR EACH MANAGER
-- ============================================

-- Fix Yugandhar
SELECT fix_manager_user_role('yugandhar@ktl.com', 'manager');

-- Fix Goutham
SELECT fix_manager_user_role('gouthampasunuti88@gmail.com', 'manager');

-- Fix Aamer (ensure he has manager role, not just employee)
SELECT fix_manager_user_role('aamer4seo@gmail.com', 'manager');

-- Clean up the function
DROP FUNCTION IF EXISTS fix_manager_user_role(TEXT, TEXT);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT 
  au.email as auth_email,
  au.id as auth_user_id,
  e.name as employee_name,
  e.email as employee_email,
  d.name as department_name,
  ur.role as user_role,
  ur.department_id as user_role_dept_id
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN employees e ON e.id = ur.employee_id
LEFT JOIN departments d ON d.id = ur.department_id
WHERE au.email IN (
  'yugandhar@ktl.com',
  'gouthampasunuti88@gmail.com',
  'aamer4seo@gmail.com'
)
ORDER BY au.email, d.name;
