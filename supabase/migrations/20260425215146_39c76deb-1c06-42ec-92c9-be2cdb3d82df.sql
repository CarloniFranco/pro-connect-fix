CREATE OR REPLACE FUNCTION public.notify_on_new_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo notificamos solicitudes tradicionales (cliente pide presupuesto).
  -- Las reservas con seña pagada las maneja notify_on_status_change para evitar duplicados.
  IF NEW.status = 'nueva' THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id,
      'nueva_solicitud',
      '¡Tenés un nuevo pedido de trabajo!',
      COALESCE(NEW.client_name, 'Un cliente') || ' solicitó ' || COALESCE(NEW.service_type, 'un servicio') || '. Revisá tu agenda para responder.',
      '/dashboard',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;