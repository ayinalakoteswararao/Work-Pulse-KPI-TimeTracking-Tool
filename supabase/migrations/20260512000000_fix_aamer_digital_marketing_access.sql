-- Migration: Fix Aamer's manager access to Digital Marketing department only
-- Created: 2026-05-12
-- Purpose: Ensure aamer4seo@gmail.com has manager role for Digital Marketing department only

-- ============================================
-- STEP 1: Clean up any existing user_roles for aamer
-- ============================================

DELETE FROM user_roles 
WHERE user_id IN (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = 'aamer4seo@gmail.com'
);

-- ============================================
-- STEP 2: Insert fresh manager role for aamer (Digital Marketing department only)
-- ============================================

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  au.id,
  'manager',
  e.id,
  d.id
FROM auth.users au
JOIN employees e ON e.email = au.email
JOIN departments d ON d.id = e.department_id
WHERE au.email = 'aamer4seo@gmail.com'
  AND (d.name ILIKE '%digital marketing%' OR d.name ILIKE '%digital%');

-- ============================================
-- STEP 3: Verify the changes
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
WHERE au.email = 'aamer4seo@gmail.com'
ORDER BY d.name;
