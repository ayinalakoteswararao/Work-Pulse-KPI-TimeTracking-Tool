-- Fix user role assignment trigger to properly read from metadata
-- This migration ensures the trigger correctly assigns roles based on signup metadata

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user metadata contains role preference
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  
  -- Ensure role is valid, default to employee if invalid
  IF user_role NOT IN ('admin', 'employee') THEN
    user_role := 'employee';
  END IF;
  
  -- Insert with the correct role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Log for debugging
  RAISE LOG 'User % created with role: %', NEW.id, user_role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users who might have wrong roles
-- This is a one-time fix for users created with the old trigger
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.raw_user_meta_data->>'role' = 'admin' 
  AND u.id = user_roles.user_id
);
