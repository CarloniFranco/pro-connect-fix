ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 60;

ALTER TABLE public.professional_profiles
ADD CONSTRAINT slot_duration_minutes_valid
CHECK (slot_duration_minutes IN (15, 20, 30, 40, 45, 60, 90, 120, 180));