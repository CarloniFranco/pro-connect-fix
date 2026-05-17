
-- 1. Subscriptions: renombrar columnas Stripe → genéricas para soportar MP
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS init_point text;

-- Copiar valores existentes de stripe_* a provider_*
UPDATE public.subscriptions 
SET provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
    provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id)
WHERE provider_subscription_id IS NULL OR provider_customer_id IS NULL;

-- Hacer stripe_* nullable (las dejamos por compat)
ALTER TABLE public.subscriptions 
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN price_id DROP NOT NULL;

-- 2. service_requests: campos para MP deposit
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS deposit_payment_id text,
  ADD COLUMN IF NOT EXISTS deposit_refund_id text,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deposit_init_point text,
  ADD COLUMN IF NOT EXISTS service_amount numeric;

COMMENT ON COLUMN public.service_requests.deposit_status IS 'pending | paid | refunded | forfeited | failed';
COMMENT ON COLUMN public.service_requests.service_amount IS 'Monto total estimado del servicio (la seña es 10%)';

-- 3. has_active_subscription: actualizar para considerar provider MP
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND environment = check_env
    AND (
      (status IN ('active', 'trialing', 'authorized') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end IS NOT NULL AND current_period_end > now())
    )
  );
$function$;

-- 4. Notificación nueva: reembolso de seña procesado
CREATE OR REPLACE FUNCTION public.notify_on_deposit_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deposit_status = 'refunded' AND (OLD.deposit_status IS DISTINCT FROM 'refunded') AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id,
      'sena_reembolsada',
      'Seña reembolsada',
      'Te reembolsamos la seña de ' || COALESCE(NEW.service_type, 'tu servicio') || '. Puede demorar 2-10 días hábiles en verse en tu cuenta.',
      '/mis-pedidos',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_deposit_refund ON public.service_requests;
CREATE TRIGGER trg_notify_on_deposit_refund
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_deposit_refund();
