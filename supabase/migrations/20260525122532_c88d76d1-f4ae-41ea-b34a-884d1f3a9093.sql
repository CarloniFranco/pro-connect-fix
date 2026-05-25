
-- Ensure primary key on app_config for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_config_pkey'
  ) THEN
    ALTER TABLE public.app_config ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);
  END IF;
END $$;

-- Seed plan price rows (admins can later edit them)
INSERT INTO public.app_config (key, value) VALUES
  ('plan_price_basico', '6999'),
  ('plan_price_premium', '14000')
ON CONFLICT (key) DO NOTHING;

-- Allow admins to read & manage plan_price_* config rows.
-- Public readable view for plan prices only (no other config exposed).
CREATE OR REPLACE VIEW public.plan_prices AS
SELECT key, value::numeric AS amount
FROM public.app_config
WHERE key IN ('plan_price_basico', 'plan_price_premium');

GRANT SELECT ON public.plan_prices TO anon, authenticated;

-- Admin policies on app_config restricted to plan_price_* keys
DROP POLICY IF EXISTS "Admins can read plan prices" ON public.app_config;
CREATE POLICY "Admins can read plan prices"
ON public.app_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND key LIKE 'plan_price_%');

DROP POLICY IF EXISTS "Admins can update plan prices" ON public.app_config;
CREATE POLICY "Admins can update plan prices"
ON public.app_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND key LIKE 'plan_price_%')
WITH CHECK (public.has_role(auth.uid(), 'admin') AND key LIKE 'plan_price_%');

DROP POLICY IF EXISTS "Admins can insert plan prices" ON public.app_config;
CREATE POLICY "Admins can insert plan prices"
ON public.app_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND key LIKE 'plan_price_%');
