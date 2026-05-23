
-- 1) Flag público en professional_profiles
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS mp_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mp_connected_at timestamptz;

-- 2) Tabla privada con tokens OAuth del pro
CREATE TABLE IF NOT EXISTS public.professional_mp_credentials (
  user_id uuid PRIMARY KEY,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  public_key text,
  live_mode boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_mp_credentials ENABLE ROW LEVEL SECURITY;

-- Sin políticas para usuarios: solo service_role puede acceder (bypassa RLS).
-- Permitimos al dueño ver solo metadata mínima via función segura (no la implementamos ahora).

CREATE TRIGGER trg_mp_credentials_updated_at
BEFORE UPDATE ON public.professional_mp_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Estados OAuth (anti-CSRF)
CREATE TABLE IF NOT EXISTS public.mp_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.mp_oauth_states ENABLE ROW LEVEL SECURITY;
-- Solo service_role
