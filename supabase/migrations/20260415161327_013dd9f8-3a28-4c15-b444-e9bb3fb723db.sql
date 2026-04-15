-- Recreate the view with security_invoker to fix security definer warning
DROP VIEW IF EXISTS public.professional_profiles_public;
CREATE VIEW public.professional_profiles_public
WITH (security_invoker = on) AS
SELECT id, user_id, full_name, rubro, descripcion, photo_url, plan, verified, created_at, updated_at
FROM public.professional_profiles
WHERE available = true;