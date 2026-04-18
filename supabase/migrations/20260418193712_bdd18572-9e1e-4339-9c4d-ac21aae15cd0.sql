-- Update notification trigger to also notify professional when CLIENT cancels
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pro_name_val TEXT;
BEGIN
  SELECT full_name INTO pro_name_val
  FROM professional_profiles
  WHERE user_id = NEW.professional_id
  LIMIT 1;

  IF NEW.status = 'cotizada' AND (OLD.status IS DISTINCT FROM 'cotizada') AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id, 'presupuesto_recibido', '¡Tenés un nuevo presupuesto!',
      COALESCE(pro_name_val, 'Un profesional') || ' te envió un presupuesto para ' || COALESCE(NEW.service_type, 'tu solicitud') || '. Tocá acá para verlo.',
      '/mis-pedidos', NEW.id
    );
  END IF;

  IF NEW.status = 'rechazada_profesional' AND OLD.status IS DISTINCT FROM 'rechazada_profesional' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id, 'solicitud_rechazada', 'Solicitud no disponible',
      COALESCE(pro_name_val, 'El profesional') || ' no puede tomar tu solicitud de ' || COALESCE(NEW.service_type, 'servicio') || ' en este momento.',
      '/mis-pedidos', NEW.id
    );
  END IF;

  -- Notify PROFESSIONAL when client cancels (rechazada_cliente)
  IF NEW.status = 'rechazada_cliente' AND OLD.status IS DISTINCT FROM 'rechazada_cliente' THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id, 'cliente_cancelo', 'El cliente canceló el turno',
      COALESCE(NEW.client_name, 'El cliente') || ' canceló la solicitud de ' || COALESCE(NEW.service_type, 'servicio') || '.',
      '/dashboard', NEW.id
    );
  END IF;

  IF NEW.status = 'aceptada' AND OLD.status IS DISTINCT FROM 'aceptada' THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id, 'presupuesto_aceptado', '¡Presupuesto aceptado!',
      COALESCE(NEW.client_name, 'El cliente') || ' aceptó tu presupuesto de ' || COALESCE(NEW.service_type, 'servicio') || '.',
      '/dashboard', NEW.id
    );
  END IF;

  IF NEW.deposit_paid = true AND (OLD.deposit_paid IS DISTINCT FROM true) THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id, 'seña_pagada', '¡Turno confirmado! Seña recibida',
      COALESCE(NEW.client_name, 'El cliente') || ' pagó la seña para ' || COALESCE(NEW.service_type, 'el servicio') || '. El turno está confirmado.',
      '/dashboard', NEW.id
    );
  END IF;

  IF NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM 'finalizada' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id, 'servicio_finalizado', '¡Servicio finalizado!',
      'Tu servicio de ' || COALESCE(NEW.service_type, '') || ' fue completado. ¡Dejá tu reseña!',
      '/mis-pedidos', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on service_requests
DROP TRIGGER IF EXISTS trg_notify_on_status_change ON public.service_requests;
CREATE TRIGGER trg_notify_on_status_change
AFTER UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_status_change();

DROP TRIGGER IF EXISTS trg_notify_on_new_request ON public.service_requests;
CREATE TRIGGER trg_notify_on_new_request
AFTER INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_request();