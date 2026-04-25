
-- Recrear triggers de notificaciones que se perdieron en alguna migración previa.

-- Asegurar que la función notify_on_new_request también notifica cuando un cliente
-- reserva directo (status 'aceptada' + deposit_paid=true desde el primer momento).
CREATE OR REPLACE FUNCTION public.notify_on_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caso 1: solicitud tradicional (cliente pide presupuesto)
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

  -- Caso 2: reserva directa con seña pagada (flujo nuevo del ServiceRequestForm)
  IF NEW.status = 'aceptada' AND COALESCE(NEW.deposit_paid, false) = true THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id,
      'seña_pagada',
      '¡Turno confirmado! Seña recibida',
      COALESCE(NEW.client_name, 'Un cliente') || ' reservó ' || COALESCE(NEW.service_type, 'un servicio')
        || COALESCE(' para el ' || to_char(NEW.scheduled_date, 'DD/MM') || ' a las ' || to_char(NEW.scheduled_time, 'HH24:MI'), '')
        || '. El turno está confirmado.',
      '/dashboard',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- (Re)crear el trigger de INSERT
DROP TRIGGER IF EXISTS trg_notify_new_request ON public.service_requests;
CREATE TRIGGER trg_notify_new_request
AFTER INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_request();

-- (Re)crear el trigger de UPDATE para cambios de estado
DROP TRIGGER IF EXISTS trg_notify_status_change ON public.service_requests;
CREATE TRIGGER trg_notify_status_change
AFTER UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_status_change();
