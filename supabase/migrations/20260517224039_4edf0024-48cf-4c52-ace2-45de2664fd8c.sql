CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_user_id, professional_id)
);

CREATE INDEX idx_favorites_client ON public.favorites(client_user_id);
CREATE INDEX idx_favorites_pro ON public.favorites(professional_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
TO authenticated
USING (auth.uid() = client_user_id);

CREATE POLICY "Users can add own favorites"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Users can remove own favorites"
ON public.favorites FOR DELETE
TO authenticated
USING (auth.uid() = client_user_id);