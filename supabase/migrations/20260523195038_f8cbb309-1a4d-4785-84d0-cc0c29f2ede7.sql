
-- Cleanup orphan/old data
DELETE FROM public.blocked_slots
WHERE service_request_id IS NOT NULL
  AND (
    NOT EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = blocked_slots.service_request_id)
    OR EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = blocked_slots.service_request_id AND sr.status IN ('finalizada','rechazada_cliente','rechazada_profesional'))
  );

DELETE FROM public.mp_oauth_states WHERE expires_at < now();

DELETE FROM public.notifications WHERE created_at < now() - interval '30 days';

-- Auto-release blocked slots on terminal status
CREATE OR REPLACE FUNCTION public.release_slots_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('finalizada','rechazada_cliente','rechazada_profesional')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    DELETE FROM public.blocked_slots WHERE service_request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_slots_on_terminal_status ON public.service_requests;
CREATE TRIGGER trg_release_slots_on_terminal_status
AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.release_slots_on_terminal_status();
