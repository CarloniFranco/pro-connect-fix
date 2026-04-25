-- Tabla del book de trabajos
CREATE TABLE public.professional_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  photo_url text NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_professional ON public.professional_portfolio(professional_id, display_order);

ALTER TABLE public.professional_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio"
  ON public.professional_portfolio FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert own portfolio"
  ON public.professional_portfolio FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Owner can update own portfolio"
  ON public.professional_portfolio FOR UPDATE
  TO authenticated
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Owner can delete own portfolio"
  ON public.professional_portfolio FOR DELETE
  TO authenticated
  USING (auth.uid() = professional_id);

-- Bucket público para las fotos del book
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-photos', 'portfolio-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas del bucket: cualquiera lee, solo el dueño escribe en su carpeta {user_id}/...
CREATE POLICY "Anyone can view portfolio photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-photos');

CREATE POLICY "Owner can upload portfolio photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can update own portfolio photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owner can delete own portfolio photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );