CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (
          provider = 'mercadopago'
          AND status = 'active'
          AND current_period_end IS NOT NULL
          AND current_period_end > now()
        )
        OR (
          provider <> 'mercadopago'
          AND status IN ('active', 'trialing')
          AND (current_period_end IS NULL OR current_period_end > now())
        )
        OR (
          status = 'canceled'
          AND current_period_end IS NOT NULL
          AND current_period_end > now()
        )
      )
  );
$function$;