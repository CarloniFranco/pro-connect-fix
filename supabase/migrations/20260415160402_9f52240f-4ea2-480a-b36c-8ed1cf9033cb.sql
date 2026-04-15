-- Drop the existing INSERT policy
DROP POLICY "Authenticated users can create service requests" ON public.service_requests;

-- Create tightened INSERT policy:
-- Clients must set client_user_id to their own auth.uid()
-- Professionals can create requests only with client_user_id = NULL (unregistered clients)
CREATE POLICY "Authenticated users can create service requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
  (client_user_id = auth.uid())
  OR
  (professional_id = auth.uid() AND client_user_id IS NULL)
);