
-- Make matriculas bucket private
UPDATE storage.buckets SET public = false WHERE id = 'matriculas';

-- Drop existing storage policies for matriculas bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to matriculas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to matriculas" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner access to matriculas" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own matricula" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own matricula" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own matricula" ON storage.objects;

-- Recreate policies for authenticated users only

-- SELECT: only the owner can view their own matricula files
CREATE POLICY "Authenticated owner can view matriculas"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'matriculas' AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- INSERT: only authenticated users can upload to their own folder
CREATE POLICY "Authenticated owner can upload matriculas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'matriculas' AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- UPDATE: only authenticated users can update their own files
CREATE POLICY "Authenticated owner can update matriculas"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'matriculas' AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create a public view for professional_profiles that excludes matricula_url
CREATE OR REPLACE VIEW public.professional_profiles_public AS
SELECT id, user_id, full_name, rubro, descripcion, photo_url, verified, plan, created_at, updated_at
FROM public.professional_profiles;

-- Grant access to the view
GRANT SELECT ON public.professional_profiles_public TO authenticated;
GRANT SELECT ON public.professional_profiles_public TO anon;
