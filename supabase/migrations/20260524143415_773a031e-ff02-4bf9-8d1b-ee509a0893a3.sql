
-- 1) RPC segura para obtener el teléfono solo si hay relación
CREATE OR REPLACE FUNCTION public.get_professional_phone(p_professional_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  -- Owner o admin: acceso directo
  IF v_caller = p_professional_id OR public.has_role(v_caller, 'admin') THEN
    SELECT phone INTO v_phone FROM public.professional_profiles WHERE user_id = p_professional_id LIMIT 1;
    RETURN v_phone;
  END IF;

  -- Cliente con solicitud no rechazada con ese profesional
  IF EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE professional_id = p_professional_id
      AND client_user_id = v_caller
      AND status NOT IN ('rechazada_cliente', 'rechazada_profesional')
  ) THEN
    SELECT phone INTO v_phone FROM public.professional_profiles WHERE user_id = p_professional_id LIMIT 1;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_phone(uuid) TO authenticated;

-- 2) Revocar acceso de columna `phone` a anon y authenticated
-- Re-otorgar SELECT a todas las demás columnas para no romper consultas existentes.
REVOKE SELECT ON public.professional_profiles FROM authenticated;
GRANT SELECT (
  id, user_id, full_name, rubro, descripcion, verified, photo_url, plan, available,
  work_stations, address, neighborhood, locality, province, google_maps_url,
  vehicle_types, services, lat, lng, parking_spots, slot_duration_minutes,
  mp_connected, mp_connected_at, email_notifications_enabled, created_at, updated_at
) ON public.professional_profiles TO authenticated;

-- 3) professional_mp_credentials: política explícita deny-all para clientes
CREATE POLICY "Deny all client access to mp credentials"
ON public.professional_mp_credentials
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role manages mp credentials"
ON public.professional_mp_credentials
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
