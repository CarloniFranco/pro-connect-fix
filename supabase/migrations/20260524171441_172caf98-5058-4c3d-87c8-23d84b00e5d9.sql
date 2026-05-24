
-- 1) Column-level lockdown on professional_verification sensitive columns
REVOKE UPDATE (dni_verification_status, dni_rejection_reason, dni_submitted_at)
  ON public.professional_verification FROM authenticated, anon;

-- 2) Explicit restrictive deny on app_config (service_role bypasses RLS)
CREATE POLICY "Deny all client access to app_config"
  ON public.app_config
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
