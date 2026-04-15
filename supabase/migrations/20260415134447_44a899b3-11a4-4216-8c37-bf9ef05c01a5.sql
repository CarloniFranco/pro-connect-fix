
-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('nueva', 'cotizada', 'aceptada', 'en_servicio', 'finalizada');

-- Create service requests table
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  service_type TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status public.request_status NOT NULL DEFAULT 'nueva',
  quoted_amount NUMERIC(12,2),
  quoted_details TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Professionals can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can insert requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can update their own requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = professional_id);

-- Timestamp trigger
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_service_requests_professional ON public.service_requests(professional_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_service_requests_scheduled ON public.service_requests(scheduled_date);
