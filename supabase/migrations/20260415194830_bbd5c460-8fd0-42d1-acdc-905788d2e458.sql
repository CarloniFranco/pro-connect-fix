
-- Add estimated_duration to service_requests (in hours, e.g. 0.5, 1, 1.5, 2)
ALTER TABLE public.service_requests 
ADD COLUMN estimated_duration numeric DEFAULT NULL;

-- Add status and end_time to blocked_slots for duration-based blocking
ALTER TABLE public.blocked_slots 
ADD COLUMN slot_end_time time without time zone DEFAULT NULL,
ADD COLUMN slot_status text NOT NULL DEFAULT 'pending',
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Allow professionals to update their own blocked slots (for status changes)
CREATE POLICY "Professional can update own blocked slots"
ON public.blocked_slots
FOR UPDATE
USING (professional_id = auth.uid())
WITH CHECK (professional_id = auth.uid());

-- Allow professionals to delete their own blocked slots (for release)
CREATE POLICY "Professional can delete own blocked slots"
ON public.blocked_slots
FOR DELETE
USING (professional_id = auth.uid());

-- Allow service_role to manage blocked_slots (for auto-release)
CREATE POLICY "Service role can manage all blocked slots"
ON public.blocked_slots
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
