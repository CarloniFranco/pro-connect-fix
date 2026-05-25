
DROP VIEW IF EXISTS public.plan_prices;

-- Replace the blanket deny with a deny that excludes plan_price_* rows
DROP POLICY IF EXISTS "Deny all client access to app_config" ON public.app_config;

CREATE POLICY "Deny client access to private app_config"
ON public.app_config
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (key LIKE 'plan_price_%')
WITH CHECK (key LIKE 'plan_price_%');

-- Public read of plan prices only
DROP POLICY IF EXISTS "Anyone can read plan prices" ON public.app_config;
CREATE POLICY "Anyone can read plan prices"
ON public.app_config FOR SELECT
TO anon, authenticated
USING (key LIKE 'plan_price_%');
