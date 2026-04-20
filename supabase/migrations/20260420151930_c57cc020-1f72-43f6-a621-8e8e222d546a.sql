ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}'::text[];