
-- Add response tracking and schedule compliance to service_requests
ALTER TABLE public.service_requests 
ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN schedule_met BOOLEAN;

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

-- Only the client who received the service can insert a review
CREATE POLICY "Clients can create reviews for their services"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_user_id);

-- Unique constraint: one review per service request
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_request UNIQUE (service_request_id);

-- Function to calculate professional composite score (returns JSON with breakdown)
CREATE OR REPLACE FUNCTION public.get_professional_score(p_professional_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  velocity_score NUMERIC;
  reliability_score NUMERIC;
  excellence_score NUMERIC;
  total_score NUMERIC;
  review_count INTEGER;
  avg_response_minutes NUMERIC;
  schedule_met_pct NUMERIC;
BEGIN
  -- Velocity: average response time in minutes, mapped to 1-5 stars
  -- < 5 min = 5 stars, < 15 min = 4, < 30 min = 3, < 60 min = 2, else 1
  SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60.0)
  INTO avg_response_minutes
  FROM service_requests
  WHERE professional_id = p_professional_id AND responded_at IS NOT NULL;

  IF avg_response_minutes IS NULL THEN
    velocity_score := 3; -- default
  ELSIF avg_response_minutes < 5 THEN
    velocity_score := 5;
  ELSIF avg_response_minutes < 15 THEN
    velocity_score := 4;
  ELSIF avg_response_minutes < 30 THEN
    velocity_score := 3;
  ELSIF avg_response_minutes < 60 THEN
    velocity_score := 2;
  ELSE
    velocity_score := 1;
  END IF;

  -- Reliability: percentage of scheduled services where schedule was met
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN NULL
    ELSE (COUNT(*) FILTER (WHERE schedule_met = true))::NUMERIC / COUNT(*)::NUMERIC * 100
    END
  INTO schedule_met_pct
  FROM service_requests
  WHERE professional_id = p_professional_id AND schedule_met IS NOT NULL;

  IF schedule_met_pct IS NULL THEN
    reliability_score := 3;
  ELSIF schedule_met_pct >= 95 THEN
    reliability_score := 5;
  ELSIF schedule_met_pct >= 85 THEN
    reliability_score := 4;
  ELSIF schedule_met_pct >= 70 THEN
    reliability_score := 3;
  ELSIF schedule_met_pct >= 50 THEN
    reliability_score := 2;
  ELSE
    reliability_score := 1;
  END IF;

  -- Excellence: average review rating
  SELECT AVG(rating), COUNT(*)
  INTO excellence_score, review_count
  FROM reviews
  WHERE professional_id = p_professional_id;

  IF excellence_score IS NULL THEN
    excellence_score := 3;
    review_count := 0;
  END IF;

  -- Composite: equal weight 33% each
  total_score := ROUND((velocity_score * 0.33 + reliability_score * 0.33 + excellence_score * 0.34)::NUMERIC, 1);

  RETURN json_build_object(
    'total_score', total_score,
    'velocity', velocity_score,
    'reliability', reliability_score,
    'excellence', ROUND(excellence_score::NUMERIC, 1),
    'review_count', review_count
  );
END;
$$;
