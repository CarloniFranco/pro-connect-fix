CREATE OR REPLACE FUNCTION public.notify_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pro_name_val TEXT;
  hours_until NUMERIC;
  cancel_title TEXT;
  cancel_message TEXT;
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

  IF NEW.status = 'rechazada_cliente' AND OLD.status IS DISTINCT FROM 'rechazada_cliente' THEN
    -- Calcular horas hasta el turno (si hay fecha agendada)
    IF NEW.scheduled_date IS NOT NULL THEN
      hours_until := EXTRACT(EPOCH FROM (
        (NEW.scheduled_date::timestamp + COALESCE(NEW.scheduled_time, '00:00'::time)) - now()
      )) / 3600.0;
    ELSE
      hours_until := NULL;
    END IF;

    -- Mensaje según si el turno estaba confirmado y dentro/fuera de 24hs
    IF OLD.status = 'aceptada' AND COALESCE(NEW.deposit_paid, false) = true AND hours_until IS NOT NULL AND hours_until < 24 AND hours_until > -1 THEN
      cancel_title := 'Turno cancelado — Seña no reembolsable';
      cancel_message := COALESCE(NEW.client_name, 'El cliente') || ' canceló el turno de ' || COALESCE(NEW.service_type, 'servicio')
        || ' con menos de 24hs de anticipación. La seña queda a tu favor.';
    ELSIF OLD.status = 'aceptada' THEN
      cancel_title := 'El cliente canceló el turno';
      cancel_message := COALESCE(NEW.client_name, 'El cliente') || ' canceló el turno confirmado de ' || COALESCE(NEW.service_type, 'servicio') || '.';
    ELSE
      cancel_title := 'El cliente rechazó el presupuesto';
      cancel_message := COALESCE(NEW.client_name, 'El cliente') || ' rechazó la solicitud de ' || COALESCE(NEW.service_type, 'servicio') || '.';
    END IF;

    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id, 'cliente_cancelo', cancel_title, cancel_message,
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

  IF NEW.status = 'en_servicio' AND OLD.status IS DISTINCT FROM 'en_servicio' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id, 'servicio_iniciado', '¡Tu servicio comenzó!',
      COALESCE(pro_name_val, 'El profesional') || ' inició el servicio de ' || COALESCE(NEW.service_type, '') || '. Te avisaremos cuando finalice.',
      '/mis-pedidos', NEW.id
    );
  END IF;

  IF NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM 'finalizada' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id, 'servicio_finalizado', '¡Servicio finalizado!',
      'Tu servicio de ' || COALESCE(NEW.service_type, '') || ' fue completado por ' || COALESCE(pro_name_val, 'el profesional') || '. ¡Dejá tu reseña!',
      '/mis-pedidos', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;