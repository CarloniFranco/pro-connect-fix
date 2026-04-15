-- Allow anonymous users to read the public professionals view
CREATE POLICY "Anyone can view public professional profiles"
ON public.professional_profiles
FOR SELECT
TO anon
USING (available = true AND rubro != '');

-- Also allow anon to call the scoring function
GRANT EXECUTE ON FUNCTION public.get_professional_score(uuid) TO anon;