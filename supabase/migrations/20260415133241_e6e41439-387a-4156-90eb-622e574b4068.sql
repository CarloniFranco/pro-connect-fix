
CREATE TABLE public.professional_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  rubro TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  matricula_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.professional_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.professional_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.professional_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('matriculas', 'matriculas', true);

CREATE POLICY "Users can upload their own matricula"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'matriculas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own matricula"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'matriculas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Matriculas are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'matriculas');
