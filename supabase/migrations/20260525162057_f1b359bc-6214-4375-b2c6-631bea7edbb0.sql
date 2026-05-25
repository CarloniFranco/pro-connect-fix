
CREATE OR REPLACE FUNCTION public.release_expired_slots_sql()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req_ids uuid[];
  v_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.blocked_slots
    WHERE slot_status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING service_request_id
  )
  SELECT array_agg(DISTINCT service_request_id) FILTER (WHERE service_request_id IS NOT NULL),
         count(*)
  INTO v_req_ids, v_count
  FROM deleted;

  IF v_req_ids IS NOT NULL THEN
    UPDATE public.service_requests
    SET status = 'rechazada_cliente',
        cancellation_reason = 'Sin respuesta del cliente',
        cancelled_by = 'system'
    WHERE id = ANY(v_req_ids) AND status = 'cotizada';

    UPDATE public.service_requests
    SET status = 'rechazada_cliente',
        cancellation_reason = 'Seña no pagada a tiempo',
        cancelled_by = 'system'
    WHERE id = ANY(v_req_ids) AND status = 'pendiente_pago';
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_slots_sql() FROM PUBLIC, anon, authenticated;
