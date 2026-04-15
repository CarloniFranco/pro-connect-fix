
CREATE POLICY "Users can delete their own profile"
ON public.professional_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
