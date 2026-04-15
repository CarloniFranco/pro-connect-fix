
DROP POLICY "Anyone can view profile photos" ON storage.objects;

CREATE POLICY "Anyone can view profile photos by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] IS NOT NULL);
