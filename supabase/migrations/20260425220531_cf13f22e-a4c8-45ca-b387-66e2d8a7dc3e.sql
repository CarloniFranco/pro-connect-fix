-- 1. Eliminar triggers duplicados (estaban registrados dos veces y por eso llegaban doble)
DROP TRIGGER IF EXISTS trg_notify_new_request ON public.service_requests;
DROP TRIGGER IF EXISTS trg_notify_status_change ON public.service_requests;

-- 2. Actualizar notify_on_new_request para también avisar al profesional
-- cuando la solicitud entra YA con seña pagada (reserva directa de turno)
CREATE OR REPLACE FUNCTION public.notify_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Caso 2: reserva directa de turno con seña pagada al crearse
  IF NEW.status = 'aceptada' AND COALESCE(NEW.deposit_paid, false) = true THEN
    INSERT INTO notifications (user_id, type, title, message, link, service_request_id)
    VALUES (
      NEW.professional_id,
      'seña_pagada',
      '¡Turno confirmado! Seña recibida',
      COALESCE(NEW.client_name, 'El cliente') || ' reservó un turno y pagó la seña para ' || COALESCE(NEW.service_type, 'el servicio') || '. El turno está confirmado.',
      '/dashboard',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;