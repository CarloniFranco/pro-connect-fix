
-- Drop the existing restrictive select policy
DROP POLICY "Users can view their own profile" ON public.professional_profiles;

-- Allow all authenticated users to view professional profiles
CREATE POLICY "Anyone authenticated can view professional profiles"
ON public.professional_profiles FOR SELECT
TO authenticated
USING (true);
