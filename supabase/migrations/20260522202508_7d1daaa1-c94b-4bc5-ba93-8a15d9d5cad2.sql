
-- 1) Replace the anon SELECT policy on professional_profiles with one that excludes the phone column
DROP POLICY IF EXISTS "Anyone can view public professional profiles" ON public.professional_profiles;

REVOKE SELECT ON public.professional_profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, rubro, descripcion, verified, created_at, updated_at,
  photo_url, plan, available, work_stations, address, neighborhood, google_maps_url,
  vehicle_types, services, lat, lng, province, locality, parking_spots,
  slot_duration_minutes
) ON public.professional_profiles TO anon;

CREATE POLICY "Anyone can view public professional profiles"
ON public.professional_profiles
FOR SELECT
TO anon
USING (available = true AND rubro <> '');

-- 2) Allow admins to delete matriculas files
CREATE POLICY "Admins can delete matriculas"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'matriculas' AND public.has_role(auth.uid(), 'admin'));
