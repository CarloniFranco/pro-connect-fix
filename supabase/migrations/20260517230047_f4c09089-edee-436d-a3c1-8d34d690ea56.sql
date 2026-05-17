-- Add DNI verification columns to professional_profiles
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS dni_front_url text,
  ADD COLUMN IF NOT EXISTS dni_back_url text,
  ADD COLUMN IF NOT EXISTS dni_verification_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS dni_rejection_reason text,
  ADD COLUMN IF NOT EXISTS dni_submitted_at timestamptz;

-- Validate allowed values
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_dni_verification_status_check;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_dni_verification_status_check
  CHECK (dni_verification_status IN ('pendiente', 'en_revision', 'verificado', 'rechazado'));

-- Private bucket for DNI photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dni-verifications', 'dni-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only owner can manage their own DNI files (folder = user_id)
DROP POLICY IF EXISTS "Owner can view own dni" ON storage.objects;
CREATE POLICY "Owner can view own dni"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dni-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owner can upload own dni" ON storage.objects;
CREATE POLICY "Owner can upload own dni"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dni-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owner can update own dni" ON storage.objects;
CREATE POLICY "Owner can update own dni"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dni-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'dni-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owner can delete own dni" ON storage.objects;
CREATE POLICY "Owner can delete own dni"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dni-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);