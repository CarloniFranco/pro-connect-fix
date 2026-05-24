
-- Restaurar política anónima para no romper el listado público
CREATE POLICY "Anyone can view public professional profiles"
ON public.professional_profiles
FOR SELECT
TO anon
USING ((available = true) AND (rubro <> ''::text));

-- Revocar acceso de columna mp_connected/mp_connected_at a anon (RLS no filtra columnas, GRANT sí)
REVOKE SELECT ON public.professional_profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, rubro, descripcion, verified, photo_url, plan, available,
  work_stations, address, neighborhood, locality, province, google_maps_url,
  vehicle_types, services, lat, lng, parking_spots, slot_duration_minutes,
  phone, email_notifications_enabled, created_at, updated_at
) ON public.professional_profiles TO anon;
