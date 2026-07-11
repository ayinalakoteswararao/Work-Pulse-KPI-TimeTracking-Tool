-- Add a column to persist employee profile photo URL
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create a public bucket for employee profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-profile-photos',
  'employee-profile-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Read access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view employee profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can view employee profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-profile-photos');

-- Upload/update/delete only for:
-- 1) The user's own employee folder (<employee_id>/...)
-- 2) Admin/Manager users
DROP POLICY IF EXISTS "Users can upload own employee profile photos" ON storage.objects;
CREATE POLICY "Users can upload own employee profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-photos'
  AND (
    split_part(name, '/', 1) IN (
      SELECT ur.employee_id::text
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
    )
  )
);

DROP POLICY IF EXISTS "Users can update own employee profile photos" ON storage.objects;
CREATE POLICY "Users can update own employee profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-profile-photos'
  AND (
    split_part(name, '/', 1) IN (
      SELECT ur.employee_id::text
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
    )
  )
)
WITH CHECK (
  bucket_id = 'employee-profile-photos'
  AND (
    split_part(name, '/', 1) IN (
      SELECT ur.employee_id::text
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own employee profile photos" ON storage.objects;
CREATE POLICY "Users can delete own employee profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-profile-photos'
  AND (
    split_part(name, '/', 1) IN (
      SELECT ur.employee_id::text
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.employee_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
    )
  )
);
