
-- Add client_user_id to link requests to authenticated clients
ALTER TABLE public.service_requests
ADD COLUMN client_user_id UUID;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated professionals can insert requests" ON public.service_requests;
DROP POLICY IF EXISTS "Authenticated professionals can update their own requests" ON public.service_requests;
DROP POLICY IF EXISTS "Authenticated professionals can view their own requests" ON public.service_requests;

-- INSERT: any authenticated user can create a service request
CREATE POLICY "Authenticated users can create service requests"
ON public.service_requests FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: only the assigned professional or the client who created the request
CREATE POLICY "Users can view their own service requests"
ON public.service_requests FOR SELECT
TO authenticated
USING (
  professional_id = auth.uid() OR client_user_id = auth.uid()
);

-- UPDATE: only the assigned professional or the client who created the request
CREATE POLICY "Owner or professional can update service requests"
ON public.service_requests FOR UPDATE
TO authenticated
USING (
  professional_id = auth.uid() OR client_user_id = auth.uid()
)
WITH CHECK (
  professional_id = auth.uid() OR client_user_id = auth.uid()
);
