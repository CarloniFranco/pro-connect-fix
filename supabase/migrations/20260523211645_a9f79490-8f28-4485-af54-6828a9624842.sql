-- Prevent non-service-role users from modifying deposit/payment fields on service_requests
CREATE OR REPLACE FUNCTION public.prevent_client_deposit_field_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions / webhooks) to modify anything
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive deposit/payment columns from regular users
  IF NEW.deposit_paid IS DISTINCT FROM OLD.deposit_paid THEN
    RAISE EXCEPTION 'deposit_paid can only be modified by the payment system';
  END IF;
  IF NEW.deposit_status IS DISTINCT FROM OLD.deposit_status THEN
    RAISE EXCEPTION 'deposit_status can only be modified by the payment system';
  END IF;
  IF NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount THEN
    RAISE EXCEPTION 'deposit_amount can only be modified by the payment system';
  END IF;
  IF NEW.deposit_payment_id IS DISTINCT FROM OLD.deposit_payment_id THEN
    RAISE EXCEPTION 'deposit_payment_id can only be modified by the payment system';
  END IF;
  IF NEW.deposit_refund_id IS DISTINCT FROM OLD.deposit_refund_id THEN
    RAISE EXCEPTION 'deposit_refund_id can only be modified by the payment system';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_deposit_fields ON public.service_requests;
CREATE TRIGGER protect_deposit_fields
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_deposit_field_mutation();