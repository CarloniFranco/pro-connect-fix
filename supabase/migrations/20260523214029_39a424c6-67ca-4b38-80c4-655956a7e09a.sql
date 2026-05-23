
-- Defense-in-depth: second trigger redundantly blocks non-service-role writes to deposit fields
CREATE OR REPLACE FUNCTION public.enforce_deposit_fields_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.deposit_paid IS DISTINCT FROM OLD.deposit_paid
     OR NEW.deposit_status IS DISTINCT FROM OLD.deposit_status
     OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
     OR NEW.deposit_payment_id IS DISTINCT FROM OLD.deposit_payment_id
     OR NEW.deposit_refund_id IS DISTINCT FROM OLD.deposit_refund_id
     OR NEW.deposit_init_point IS DISTINCT FROM OLD.deposit_init_point THEN
    RAISE EXCEPTION 'Deposit/payment fields are immutable from client/professional context';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_deposit_fields_immutable_trg ON public.service_requests;
CREATE TRIGGER enforce_deposit_fields_immutable_trg
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_deposit_fields_immutable();

-- Tighten review creation: must be the real client of a finalized service request
DROP POLICY IF EXISTS "Clients can create reviews for their services" ON public.reviews;
CREATE POLICY "Clients can create reviews for their services"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_user_id
  AND EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = reviews.service_request_id
      AND sr.client_user_id = auth.uid()
      AND sr.status = 'finalizada'
  )
);
