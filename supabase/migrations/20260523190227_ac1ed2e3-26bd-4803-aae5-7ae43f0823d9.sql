
-- 1) professional_profiles: restringir SELECT autenticado a perfiles publicados,
--    y agregar política separada para que el dueño pueda verse a sí mismo.
DROP POLICY IF EXISTS "Anyone authenticated can view professional profiles" ON public.professional_profiles;

CREATE POLICY "Authenticated can view published professional profiles"
ON public.professional_profiles
FOR SELECT
TO authenticated
USING (available = true AND rubro <> '');

CREATE POLICY "Owner can view own professional profile"
ON public.professional_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) blocked_slots: restringir SELECT a dueño + cliente con SR asociada + admin
DROP POLICY IF EXISTS "Professional and client can view blocked slots" ON public.blocked_slots;

CREATE POLICY "Owner pro or related client can view blocked slots"
ON public.blocked_slots
FOR SELECT
TO authenticated
USING (
  professional_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = blocked_slots.service_request_id
      AND sr.client_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 3) Bloqueo explícito (defensa en profundidad) para tablas sensibles de MP.
--    Ya tenían RLS habilitado sin políticas (default deny), pero agregamos
--    REVOKE para que ni siquiera el rol authenticated pueda intentar leerlas.
REVOKE ALL ON public.professional_mp_credentials FROM anon, authenticated;
REVOKE ALL ON public.mp_oauth_states FROM anon, authenticated;
