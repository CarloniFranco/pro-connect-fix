
-- Recreate the view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.professional_profiles_public
WITH (security_invoker = true) AS
SELECT id, user_id, full_name, rubro, descripcion, photo_url, verified, plan, created_at, updated_at
FROM public.professional_profiles;
