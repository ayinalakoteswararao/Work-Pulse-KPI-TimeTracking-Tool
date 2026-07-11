-- Migration: Add three department managers
-- Created: 2026-03-31

-- ============================================
-- MANAGER 1: Goutham Pasunuti - Overseas Department
-- Email: gouthampasunuti88@gmail.com
-- ============================================

-- Create employee record for Goutham (Overseas Manager)
INSERT INTO employees (id, name, email, role_id, department_id, first_login, employee_code)
SELECT 
  gen_random_uuid(),
  'Goutham Pasunuti',
  'gouthampasunuti88@gmail.com',
  r.id,
  d.id,
  true,
  'KTL-MGR-001'
FROM departments d
JOIN roles r ON r.department_id = d.id
WHERE d.name ILIKE '%overseas%'
LIMIT 1
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  department_id = EXCLUDED.department_id,
  employee_code = EXCLUDED.employee_code;

-- ============================================
-- MANAGER 2: Aamer - Digital Marketing Department
-- Email: aamer4seo@gmail.com
-- ============================================

-- Create employee record for Aamer (Digital Marketing Manager)
INSERT INTO employees (id, name, email, role_id, department_id, first_login, employee_code)
SELECT 
  gen_random_uuid(),
  'Aamer',
  'aamer4seo@gmail.com',
  r.id,
  d.id,
  true,
  'KTL-MGR-002'
FROM departments d
JOIN roles r ON r.department_id = d.id
WHERE d.name ILIKE '%digital marketing%' OR d.name ILIKE '%digital%'
LIMIT 1
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  department_id = EXCLUDED.department_id,
  employee_code = EXCLUDED.employee_code;

-- ============================================
-- MANAGER 3: Yugandhar - All Departments Except Digital Marketing and Overseas
-- Email: yugandhar@ktl.com
-- ============================================

-- Note: This will create user_role entries for each department
-- First, delete any existing manager entries for these emails to avoid duplicates with null values
DELETE FROM user_roles 
WHERE user_id IN (
  '666d0e70-acbc-4040-8a5c-3585ea82a011'::uuid,
  'a15763e5-2345-4d16-bd2b-63ae89c127e5'::uuid,
  '2a7fb400-7b61-4d32-9881-a1539c71af91'::uuid
);

-- Also delete by employee reference if they exist
DELETE FROM user_roles 
WHERE employee_id IN (SELECT id FROM employees WHERE email IN (
  'gouthampasunuti88@gmail.com',
  'aamer4seo@gmail.com',
  'yugandhar@ktl.com'
));

-- Create employee record for Yugandhar (will be linked to first available dept as primary)
INSERT INTO employees (id, name, email, role_id, department_id, first_login, employee_code)
SELECT 
  gen_random_uuid(),
  'Yugandhar',
  'yugandhar@ktl.com',
  r.id,
  d.id,
  true,
  'KTL-MGR-003'
FROM departments d
JOIN roles r ON r.department_id = d.id
WHERE d.name NOT ILIKE '%digital marketing%' 
  AND d.name NOT ILIKE '%overseas%'
LIMIT 1
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  employee_code = EXCLUDED.employee_code;

-- Create user_roles for Goutham (Overseas)
-- Delete any existing user_roles for this user_id first
DELETE FROM user_roles WHERE user_id = '666d0e70-acbc-4040-8a5c-3585ea82a011'::uuid;

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  '666d0e70-acbc-4040-8a5c-3585ea82a011'::uuid,
  'manager',
  e.id,
  d.id
FROM employees e
JOIN departments d ON d.id = e.department_id
WHERE e.email = 'gouthampasunuti88@gmail.com';

-- Create user_roles for Aamer (Digital Marketing)
-- Delete any existing user_roles for this user_id first
DELETE FROM user_roles WHERE user_id = 'a15763e5-2345-4d16-bd2b-63ae89c127e5'::uuid;

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  'a15763e5-2345-4d16-bd2b-63ae89c127e5'::uuid,
  'manager',
  e.id,
  d.id
FROM employees e
JOIN departments d ON d.id = e.department_id
WHERE e.email = 'aamer4seo@gmail.com';

-- Create user_roles for Yugandhar (All departments except Digital Marketing and Overseas)
-- Delete any existing user_roles for this user_id first
DELETE FROM user_roles WHERE user_id = '2a7fb400-7b61-4d32-9881-a1539c71af91'::uuid;

INSERT INTO user_roles (user_id, role, employee_id, department_id)
SELECT 
  '2a7fb400-7b61-4d32-9881-a1539c71af91'::uuid,
  'manager',
  e.id,
  d.id
FROM employees e
CROSS JOIN departments d
WHERE e.email = 'yugandhar@ktl.com'
  AND d.name NOT ILIKE '%digital marketing%'
  AND d.name NOT ILIKE '%overseas%';

-- ============================================
-- All manager user_roles have been created above with hardcoded UUIDs from the user_roles table:
-- ============================================

/*

For managers to log in via Admin Page:

1. ADMIN SETUP (to be done in Supabase Dashboard):
   Go to Authentication → Users → "Add User" or invite:
   
   - gouthampasunuti88@gmail.com (password: let them set on first login)
   - aamer4seo@gmail.com 
   - yugandhar@ktl.com

2. Or use the following SQL to create auth users (run in SQL Editor):

   -- For each manager, create auth user and link:
   DO $$
   DECLARE
     v_user_id uuid;
   BEGIN
     -- Goutham
     INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
     VALUES (gen_random_uuid(), 'gouthampasunuti88@gmail.com', '{"role":"manager"}'::jsonb, now(), now())
     RETURNING id INTO v_user_id;
     
     UPDATE user_roles SET user_id = v_user_id 
     WHERE employee_id = (SELECT id FROM employees WHERE email = 'gouthampasunuti88@gmail.com');
   END $$;

3. ALTERNATIVE - Manual Linking:
   After each manager signs up, run:
   
   UPDATE user_roles 
   SET user_id = (SELECT id FROM auth.users WHERE email = 'gouthampasunuti88@gmail.com'),
       role = 'manager'
   WHERE employee_id = (SELECT id FROM employees WHERE email = 'gouthampasunuti88@gmail.com');

   (Repeat for other managers)

4. PASSWORD SETUP:
   - Default password for first login: 12345678
   - They should change password after first login via the password change flow

*/

-- ============================================
-- VERIFY SETUP
-- ============================================

-- View all manager setups
SELECT 
  e.name,
  e.email,
  e.employee_code,
  d.name as department_name,
  ur.role as user_role
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN user_roles ur ON ur.employee_id = e.id
WHERE e.email IN (
  'gouthampasunuti88@gmail.com',
  'aamer4seo@gmail.com', 
  'yugandhar@ktl.com'
);
