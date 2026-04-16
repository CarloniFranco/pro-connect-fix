
-- Create trigger function for automatic notifications on status changes
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pro_name_val TEXT;
BEGIN
  SELECT full_name INTO pro_name_val
  FROM professional_profiles
  WHERE user_id = NEW.professional_id
  LIMIT 1;

  -- Notify CLIENT when professional sends a quote (cotizada)
  IF NEW.status = 'cotizada' AND (OLD.status IS DISTINCT FROM 'cotizada') AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id,
      'presupuesto_recibido',
      '¡Tenés un nuevo presupuesto!',
      COALESCE(pro_name_val, 'Un profesional') || ' te envió un presupuesto para ' || COALESCE(NEW.service_type, 'tu solicitud') || '. Tocá acá para verlo.',
      '/mis-pedidos',
      NEW.id
    );
  END IF;

  -- Notify CLIENT when professional rejects
  IF NEW.status = 'rechazada_profesional' AND OLD.status IS DISTINCT FROM 'rechazada_profesional' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id,
      'solicitud_rechazada',
      'Solicitud no disponible',
      COALESCE(pro_name_val, 'El profesional') || ' no puede tomar tu solicitud de ' || COALESCE(NEW.service_type, 'servicio') || ' en este momento.',
      '/mis-pedidos',
      NEW.id
    );
  END IF;

  -- Notify PROFESSIONAL when client accepts quote
  IF NEW.status = 'aceptada' AND OLD.status IS DISTINCT FROM 'aceptada' THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id,
      'presupuesto_aceptado',
      '¡Presupuesto aceptado!',
      COALESCE(NEW.client_name, 'El cliente') || ' aceptó tu presupuesto de ' || COALESCE(NEW.service_type, 'servicio') || '.',
      '/dashboard',
      NEW.id
    );
  END IF;

  -- Notify PROFESSIONAL when deposit is paid
  IF NEW.deposit_paid = true AND (OLD.deposit_paid IS DISTINCT FROM true) THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id,
      'seña_pagada',
      '¡Turno confirmado! Seña recibida',
      COALESCE(NEW.client_name, 'El cliente') || ' pagó la seña para ' || COALESCE(NEW.service_type, 'el servicio') || '. El turno está confirmado.',
      '/dashboard',
      NEW.id
    );
  END IF;

  -- Notify CLIENT when service is completed
  IF NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM 'finalizada' AND NEW.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.client_user_id,
      'servicio_finalizado',
      '¡Servicio finalizado!',
      'Tu servicio de ' || COALESCE(NEW.service_type, '') || ' fue completado. ¡Dejá tu reseña!',
      '/mis-pedidos',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on UPDATE for status changes
CREATE TRIGGER trg_notify_status_change
AFTER UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_status_change();

-- Trigger on INSERT for new requests
CREATE OR REPLACE FUNCTION public.notify_on_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE TRIGGER trg_notify_new_request
AFTER INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_request();
