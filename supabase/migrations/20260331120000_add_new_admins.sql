-- Migration: Add new admin users - STEP 1: Create Employee Records
-- Created: 2026-03-31
-- NOTE: Users must sign up via Auth page first, then run STEP 2 to link them

-- ============================================
-- STEP 1: Create Employee Records Only
-- ============================================

-- ADMIN 1: Gowtham - gowtham@kayalas.com
INSERT INTO employees (id, name, email, role_id, department_id, first_login, employee_code)
SELECT 
  gen_random_uuid(),
  'Gowtham',
  'gowtham@kayalas.com',
  r.id,
  d.id,
  true,
  'KTL-ADM-001'
FROM departments d
JOIN roles r ON r.department_id = d.id
LIMIT 1
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  employee_code = EXCLUDED.employee_code;

-- Create admin user_roles entry for Gowtham (will be linked when user signs up)
-- First, delete any existing entries for this user to avoid duplicates
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gowtham@kayalas.com');

-- Then insert the new admin role
INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  au.id,
  'admin',
  e.id,
  e.department_id
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE au.email = 'gowtham@kayalas.com';

-- ADMIN 2: Intyuga - intyuga@ktl.com
INSERT INTO employees (id, name, email, role_id, department_id, first_login, employee_code)
SELECT 
  gen_random_uuid(),
  'Intyuga',
  'intyuga@ktl.com',
  r.id,
  d.id,
  true,
  'KTL-ADM-002'
FROM departments d
JOIN roles r ON r.department_id = d.id
LIMIT 1
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  employee_code = EXCLUDED.employee_code;

-- Create admin user_roles entry for Intyuga (will be linked when user signs up)
-- This ensures the admin role is properly configured
-- First, delete any existing entries for this user to avoid duplicates
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'intyuga@ktl.com');

-- Then insert the new admin role
INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  au.id,
  'admin',
  e.id,
  e.department_id
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE au.email = 'intyuga@ktl.com';

-- ============================================
-- VERIFY Employee Records and Admin Access
-- ============================================
SELECT 
  e.name,
  e.email,
  e.employee_code,
  d.name as department_name,
  ur.role as user_role,
  ur.user_id as auth_user_id,
  CASE 
    WHEN ur.user_id IS NOT NULL THEN 'Admin access granted'
    ELSE 'Admin access pending - user needs to sign up first'
  END as admin_status
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN user_roles ur ON ur.employee_id = e.id
WHERE e.email IN (
  'gowtham@kayalas.com',
  'intyuga@ktl.com'
);

/*

========================================
STEP 2: LINK AFTER USERS SIGN UP
========================================

After Gowtham and Intyuga sign up via the Auth page, 
run this SQL to grant them admin access:

-- Link Gowtham as Admin
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gowtham@kayalas.com');

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  au.id,
  'admin',
  e.id,
  e.department_id
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE au.email = 'gowtham@kayalas.com';

-- Link Intyuga as Admin
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'intyuga@ktl.com');

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  au.id,
  'admin',
  e.id,
  e.department_id
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE au.email = 'intyuga@ktl.com';

-- Verify admin setup
SELECT 
  e.name,
  e.email,
  e.employee_code,
  d.name as department_name,
  ur.role as user_role,
  ur.user_id
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN user_roles ur ON ur.employee_id = e.id
WHERE e.email IN (
  'gowtham@kayalas.com',
  'intyuga@ktl.com'
);

*/

/*
========================================
STEP 3: MANUAL USER CREATION (if signup fails)
========================================

If signup is rate limited (429 error), create auth users manually:

1. Via Supabase Dashboard:
   - Go to Authentication > Users
   - Click "Add user"
   - Email: intyuga@ktl.com
   - Password: 12345678
   - Role: authenticated
   - User metadata: {"role": "admin"}

2. Or via Supabase CLI:
   supabase auth create-user --email intyuga@ktl.com --password 12345678 --data '{"role":"admin"}'

3. Then run the linking SQL above (STEP 2) to connect to employee record

*/
