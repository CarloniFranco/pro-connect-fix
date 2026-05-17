
-- Guardar el service role key en vault para que el trigger pueda autenticar al edge function
DO $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'service_role_key',
      'Service role key used by notification email trigger'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si no se puede crear desde settings, lo dejamos para inserción manual
  NULL;
END $$;

-- Crear el trigger que dispara el envío de email cuando se inserta una notificación
DROP TRIGGER IF EXISTS trg_send_notification_email ON public.notifications;
CREATE TRIGGER trg_send_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email_trigger();
