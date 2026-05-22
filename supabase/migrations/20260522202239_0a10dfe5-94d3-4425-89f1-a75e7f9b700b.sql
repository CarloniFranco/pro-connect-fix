
-- Create private config table for internal trigger secret
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER functions can read

INSERT INTO public.app_config (key, value)
VALUES ('internal_trigger_secret', '382eef67320098742bb1e49d30d7a2f2c3509ae8198d2da16c650f52c73478c2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update trigger to pass x-internal-secret header
CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'internal_trigger_secret';

  PERFORM net.http_post(
    url := 'https://uugvnhmtmfiplpqcrxjg.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_notification_email_trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
