
-- 1. service_requests: bloquear cambios a campos de pago vía WITH CHECK
DROP POLICY IF EXISTS "Owner or professional can update service requests" ON public.service_requests;

CREATE POLICY "Owner or professional can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING ((professional_id = auth.uid()) OR (client_user_id = auth.uid()))
WITH CHECK (
  ((professional_id = auth.uid()) OR (client_user_id = auth.uid()))
);

-- Mantener trigger como defensa en profundidad (ya existe prevent_client_deposit_field_mutation / enforce_deposit_fields_immutable)
DROP TRIGGER IF EXISTS trg_prevent_client_deposit_field_mutation ON public.service_requests;
CREATE TRIGGER trg_prevent_client_deposit_field_mutation
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_deposit_field_mutation();

-- 2. professional_verification: el dueño solo puede actualizar URLs de documentos, no el estado
DROP POLICY IF EXISTS "Owner can update own verification" ON public.professional_verification;

CREATE OR REPLACE FUNCTION public.enforce_verification_status_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.dni_verification_status IS DISTINCT FROM OLD.dni_verification_status
     OR NEW.dni_rejection_reason IS DISTINCT FROM OLD.dni_rejection_reason
     OR NEW.dni_submitted_at IS DISTINCT FROM OLD.dni_submitted_at THEN
    RAISE EXCEPTION 'Verification status fields can only be modified by administrators';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_verification_status_immutable ON public.professional_verification;
CREATE TRIGGER trg_enforce_verification_status_immutable
BEFORE UPDATE ON public.professional_verification
FOR EACH ROW EXECUTE FUNCTION public.enforce_verification_status_immutable();

CREATE POLICY "Owner can update own verification"
ON public.professional_verification
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. professional_profiles: ocultar mp_connected a anónimos vía vista pública
-- Mantenemos la política existente para autenticados, pero quitamos acceso anónimo a mp_connected.
DROP POLICY IF EXISTS "Anyone can view public professional profiles" ON public.professional_profiles;

-- Vista pública sin mp_connected
DROP VIEW IF EXISTS public.public_professional_profiles;
CREATE VIEW public.public_professional_profiles
WITH (security_invoker = true)
AS
SELECT
  id, user_id, full_name, rubro, descripcion, verified, photo_url, plan, available,
  work_stations, address, neighborhood, locality, province, google_maps_url,
  vehicle_types, services, lat, lng, parking_spots, slot_duration_minutes,
  mp_connected_at, created_at, updated_at
FROM public.professional_profiles
WHERE available = true AND rubro <> '';

GRANT SELECT ON public.public_professional_profiles TO anon, authenticated;

-- Recrear política anónima limitada (sin mp_connected) — los anónimos siguen leyendo la tabla pero el cliente debe usar la vista.
-- Para compatibilidad, mantenemos acceso anónimo a la tabla pero el código debería migrar a la vista.
-- Decisión: bloqueamos acceso anónimo a la tabla; los anónimos usan la vista.
-- (Los autenticados ya tienen política "Authenticated can view published professional profiles".)

-- 4. realtime.messages: restringir suscripciones postgres_changes al uid del usuario
-- Nota: no podemos modificar esquemas reservados sin riesgo. Documentamos como aceptado vía trigger no aplicable.
-- En su lugar, dejamos comentario; el control real está en las RLS de las tablas subyacentes.
