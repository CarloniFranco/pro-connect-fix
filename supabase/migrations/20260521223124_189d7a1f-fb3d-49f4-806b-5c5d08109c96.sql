-- 1. Create professional_verification table
CREATE TABLE public.professional_verification (
  user_id uuid PRIMARY KEY,
  dni_front_url text,
  dni_back_url text,
  dni_verification_status text NOT NULL DEFAULT 'pendiente',
  dni_rejection_reason text,
  dni_submitted_at timestamptz,
  matricula_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own verification"
  ON public.professional_verification FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification"
  ON public.professional_verification FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own verification"
  ON public.professional_verification FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own verification"
  ON public.professional_verification FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification"
  ON public.professional_verification FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_professional_verification_updated_at
  BEFORE UPDATE ON public.professional_verification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing data
INSERT INTO public.professional_verification
  (user_id, dni_front_url, dni_back_url, dni_verification_status, dni_rejection_reason, dni_submitted_at, matricula_url)
SELECT user_id, dni_front_url, dni_back_url, dni_verification_status, dni_rejection_reason, dni_submitted_at, matricula_url
FROM public.professional_profiles
ON CONFLICT (user_id) DO NOTHING;

-- 3. Drop sensitive columns from professional_profiles
ALTER TABLE public.professional_profiles
  DROP COLUMN dni_front_url,
  DROP COLUMN dni_back_url,
  DROP COLUMN dni_verification_status,
  DROP COLUMN dni_rejection_reason,
  DROP COLUMN dni_submitted_at,
  DROP COLUMN matricula_url;

-- 4. Validation trigger for service_requests PII fields
CREATE OR REPLACE FUNCTION public.validate_service_request_client_data()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_name IS NOT NULL AND length(NEW.client_name) > 120 THEN
    RAISE EXCEPTION 'client_name too long (max 120)';
  END IF;
  IF NEW.client_phone IS NOT NULL AND length(NEW.client_phone) > 40 THEN
    RAISE EXCEPTION 'client_phone too long (max 40)';
  END IF;
  IF NEW.client_address IS NOT NULL AND length(NEW.client_address) > 300 THEN
    RAISE EXCEPTION 'client_address too long (max 300)';
  END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 4000 THEN
    RAISE EXCEPTION 'description too long (max 4000)';
  END IF;
  IF NEW.client_phone IS NOT NULL AND NEW.client_phone !~ '^[0-9 +()\-]*$' THEN
    RAISE EXCEPTION 'client_phone contains invalid characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_requests_validate_client_data
  BEFORE INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_request_client_data();

-- 5. Tighten storage listing on public buckets
DROP POLICY IF EXISTS "Anyone can view profile photos by path" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portfolio photos" ON storage.objects;

CREATE POLICY "Owner or admin can list profile photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Owner or admin can list portfolio photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'portfolio-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );