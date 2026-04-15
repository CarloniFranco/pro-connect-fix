
-- Add new enum values for request statuses
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'rechazada_profesional';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'rechazada_cliente';

-- Add deposit fields to service_requests
ALTER TABLE public.service_requests 
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false;

-- Professional availability (weekly schedule)
CREATE TABLE IF NOT EXISTS public.professional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, day_of_week, start_time)
);

ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage own availability"
  ON public.professional_availability FOR ALL
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Anyone authenticated can view availability"
  ON public.professional_availability FOR SELECT
  TO authenticated
  USING (true);

-- Blocked slots (confirmed appointments)
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  service_request_id uuid REFERENCES public.service_requests(id),
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, slot_date, slot_time)
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professional and client can view blocked slots"
  ON public.blocked_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert blocked slots"
  ON public.blocked_slots FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.service_requests sr 
    WHERE sr.id = service_request_id AND sr.client_user_id = auth.uid()
  ));

-- Update scoring function to penalize declines
CREATE OR REPLACE FUNCTION public.get_professional_score(p_professional_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  velocity_score NUMERIC;
  reliability_score NUMERIC;
  excellence_score NUMERIC;
  total_score NUMERIC;
  review_count INTEGER;
  avg_response_minutes NUMERIC;
  schedule_met_pct NUMERIC;
  decline_count INTEGER;
  total_requests INTEGER;
  decline_rate NUMERIC;
BEGIN
  -- Velocity: average response time
  SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60.0)
  INTO avg_response_minutes
  FROM service_requests
  WHERE professional_id = p_professional_id AND responded_at IS NOT NULL;

  IF avg_response_minutes IS NULL THEN velocity_score := 3;
  ELSIF avg_response_minutes < 5 THEN velocity_score := 5;
  ELSIF avg_response_minutes < 15 THEN velocity_score := 4;
  ELSIF avg_response_minutes < 30 THEN velocity_score := 3;
  ELSIF avg_response_minutes < 60 THEN velocity_score := 2;
  ELSE velocity_score := 1;
  END IF;

  -- Reliability: schedule met + decline penalty
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN NULL
    ELSE (COUNT(*) FILTER (WHERE schedule_met = true))::NUMERIC / COUNT(*)::NUMERIC * 100
    END
  INTO schedule_met_pct
  FROM service_requests
  WHERE professional_id = p_professional_id AND schedule_met IS NOT NULL;

  -- Count declines for penalty
  SELECT COUNT(*) INTO decline_count
  FROM service_requests
  WHERE professional_id = p_professional_id AND status = 'rechazada_profesional';
  
  SELECT COUNT(*) INTO total_requests
  FROM service_requests
  WHERE professional_id = p_professional_id;

  IF total_requests > 0 THEN
    decline_rate := decline_count::NUMERIC / total_requests::NUMERIC;
  ELSE
    decline_rate := 0;
  END IF;

  IF schedule_met_pct IS NULL THEN reliability_score := 3;
  ELSIF schedule_met_pct >= 95 THEN reliability_score := 5;
  ELSIF schedule_met_pct >= 85 THEN reliability_score := 4;
  ELSIF schedule_met_pct >= 70 THEN reliability_score := 3;
  ELSIF schedule_met_pct >= 50 THEN reliability_score := 2;
  ELSE reliability_score := 1;
  END IF;

  -- Apply decline penalty: each 10% decline rate = -0.5 points
  reliability_score := GREATEST(1, reliability_score - (decline_rate * 5));

  -- Excellence: average review rating
  SELECT AVG(rating), COUNT(*)
  INTO excellence_score, review_count
  FROM reviews
  WHERE professional_id = p_professional_id;

  IF excellence_score IS NULL THEN
    excellence_score := 3;
    review_count := 0;
  END IF;

  total_score := ROUND((velocity_score * 0.33 + reliability_score * 0.33 + excellence_score * 0.34)::NUMERIC, 1);

  RETURN json_build_object(
    'total_score', total_score,
    'velocity', velocity_score,
    'reliability', ROUND(reliability_score::NUMERIC, 1),
    'excellence', ROUND(excellence_score::NUMERIC, 1),
    'review_count', review_count,
    'decline_rate', ROUND(decline_rate * 100, 1)
  );
END;
$function$;

-- Triggers for updated_at
CREATE TRIGGER update_professional_availability_updated_at
  BEFORE UPDATE ON public.professional_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
