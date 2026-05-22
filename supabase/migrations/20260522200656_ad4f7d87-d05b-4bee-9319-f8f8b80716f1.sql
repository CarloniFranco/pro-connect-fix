
-- 1) Fix search_path on validate_service_request_client_data
CREATE OR REPLACE FUNCTION public.validate_service_request_client_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.client_name IS NOT NULL AND length(NEW.client_name) > 120 THEN
    RAISE EXCEPTION 'client_name too long (max 120)';
  END IF;
  IF NEW.client_phone IS NOT NULL AND length(NEW.client_phone) > 40 THEN
    RAISE EXCEPTION 'client_phone too long (max 40)';
  END IF;
  IF NEW.client_address IS NOT NULL AND length(NEW.client_address) > 300 THEN
    RAISE EXCEPTION 'client_address too long (max 300)';
  END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 4000 THEN
    RAISE EXCEPTION 'description too long (max 4000)';
  END IF;
  IF NEW.client_phone IS NOT NULL AND NEW.client_phone !~ '^[0-9 +()\-]*$' THEN
    RAISE EXCEPTION 'client_phone contains invalid characters';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Hard-block privilege escalation on user_roles via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service_role and the hardcoded auto-admin trigger path
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Only admins may insert/modify role rows
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can assign user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_assignment_trg ON public.user_roles;
CREATE TRIGGER prevent_role_self_assignment_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_assignment();

-- 3) Admin SELECT policy on matriculas bucket
DROP POLICY IF EXISTS "Admins can view all matriculas" ON storage.objects;
CREATE POLICY "Admins can view all matriculas"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'matriculas' AND public.has_role(auth.uid(), 'admin'));

-- 4) Remove unrestricted realtime broadcast INSERT (app uses postgres_changes only)
DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;
