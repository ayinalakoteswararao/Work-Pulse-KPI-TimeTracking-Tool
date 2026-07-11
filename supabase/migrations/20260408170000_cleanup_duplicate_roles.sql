-- Migration: Clean up duplicate user_roles and fix manager assignments
-- Created: 2026-04-08

-- ============================================
-- STEP 1: Delete ALL existing user_roles for aamer (clean slate)
-- ============================================

DELETE FROM user_roles 
WHERE user_id = 'cd039333-2e14-48e7-bb6f-aa9d845b6f8a'::uuid;

-- ============================================
-- STEP 2: Insert fresh manager role for aamer (Digital Marketing department)
-- ============================================

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  'cd039333-2e14-48e7-bb6f-aa9d845b6f8a'::uuid,
  'manager',
  e.id,
  d.id
FROM employees e
JOIN departments d ON d.id = e.department_id
WHERE e.email = 'aamer4seo@gmail.com'
  AND (d.name ILIKE '%digital marketing%' OR d.name ILIKE '%digital%')
LIMIT 1;

-- ============================================
-- STEP 3: Clean up duplicate employee entries with null department_id for goutham
-- ============================================

-- First delete ALL employee entries for goutham
DELETE FROM user_roles 
WHERE user_id = 'd26ca2da-a39f-425c-b675-cf08eff65d16'::uuid
  AND role = 'employee';

-- ============================================
-- STEP 4: Verify final state
-- ============================================

SELECT 
  au.email as auth_email,
  au.id as auth_user_id,
  ur.role,
  ur.department_id,
  d.name as department_name,
  e.name as employee_name,
  e.employee_code
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = ur.department_id
LEFT JOIN employees e ON e.id = ur.employee_id
WHERE au.email IN (
  'yugandhar@ktl.com',
  'gouthampasunuti88@gmail.com',
  'aamer4seo@gmail.com'
)
ORDER BY au.email, ur.role;
