
-- 1. blocked_slots: tighten service_role policy to service_role only
DROP POLICY IF EXISTS "Service role can manage all blocked slots" ON public.blocked_slots;
CREATE POLICY "Service role can manage all blocked slots"
ON public.blocked_slots
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 1b. blocked_slots: harden INSERT to require active (non-terminal) service_request
DROP POLICY IF EXISTS "System can insert blocked slots" ON public.blocked_slots;
CREATE POLICY "System can insert blocked slots"
ON public.blocked_slots
FOR INSERT
TO authenticated
WITH CHECK (
  (
    professional_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = blocked_slots.service_request_id
      AND sr.client_user_id = auth.uid()
      AND sr.status NOT IN ('finalizada','rechazada_cliente','rechazada_profesional')
  )
);

-- 2. mp_oauth_states: explicit deny-all for non-service-role, plus service_role full access
DROP POLICY IF EXISTS "Deny all client access to oauth states" ON public.mp_oauth_states;
CREATE POLICY "Deny all client access to oauth states"
ON public.mp_oauth_states
AS PERMISSIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages oauth states" ON public.mp_oauth_states;
CREATE POLICY "Service role manages oauth states"
ON public.mp_oauth_states
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. realtime.messages: restrict topic subscriptions to topics containing the user's own id
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow listening to authenticated realtime messages" ON realtime.messages;

CREATE POLICY "Users can only subscribe to own-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR realtime.topic() LIKE 'postgres_changes%'
);
