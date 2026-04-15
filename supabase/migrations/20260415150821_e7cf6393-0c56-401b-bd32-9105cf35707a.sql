
DROP POLICY "Authenticated users can create service requests" ON public.service_requests;

CREATE POLICY "Authenticated users can create service requests"
ON public.service_requests FOR INSERT
TO authenticated
WITH CHECK (
  client_user_id = auth.uid() OR professional_id = auth.uid()
);
