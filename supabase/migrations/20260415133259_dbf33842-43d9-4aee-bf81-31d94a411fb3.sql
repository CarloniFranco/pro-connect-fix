
DROP POLICY "Matriculas are publicly accessible" ON storage.objects;

CREATE POLICY "Matriculas are accessible by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'matriculas' AND auth.uid()::text = (storage.foldername(name))[1]);
