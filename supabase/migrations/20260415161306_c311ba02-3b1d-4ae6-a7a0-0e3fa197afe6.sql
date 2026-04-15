-- Add available column to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN available boolean NOT NULL DEFAULT true;

-- Recreate the public view to filter by available
DROP VIEW IF EXISTS public.professional_profiles_public;
CREATE VIEW public.professional_profiles_public AS
SELECT id, user_id, full_name, rubro, descripcion, photo_url, plan, verified, created_at, updated_at
FROM public.professional_profiles
WHERE available = true;