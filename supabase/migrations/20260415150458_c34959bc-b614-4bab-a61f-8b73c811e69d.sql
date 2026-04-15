
-- Fix professional_profiles: change INSERT/UPDATE from public to authenticated
DROP POLICY "Users can insert their own profile" ON public.professional_profiles;
DROP POLICY "Users can update their own profile" ON public.professional_profiles;

CREATE POLICY "Authenticated users can insert their own profile"
ON public.professional_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.professional_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Fix service_requests: change INSERT/UPDATE from public to authenticated
DROP POLICY "Professionals can insert requests" ON public.service_requests;
DROP POLICY "Professionals can update their own requests" ON public.service_requests;
DROP POLICY "Professionals can view their own requests" ON public.service_requests;

CREATE POLICY "Authenticated professionals can insert requests"
ON public.service_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Authenticated professionals can update their own requests"
ON public.service_requests FOR UPDATE
TO authenticated
USING (auth.uid() = professional_id);

CREATE POLICY "Authenticated professionals can view their own requests"
ON public.service_requests FOR SELECT
TO authenticated
USING (auth.uid() = professional_id);
