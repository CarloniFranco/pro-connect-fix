
-- Add photo_url to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN photo_url TEXT;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can upload their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
