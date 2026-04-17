ALTER TABLE public.professional_profiles
ADD COLUMN work_stations INTEGER NOT NULL DEFAULT 1 CHECK (work_stations >= 1 AND work_stations <= 20);

COMMENT ON COLUMN public.professional_profiles.work_stations IS 'Number of parallel work stations (e.g., car wash bays). Allows multiple bookings per time slot.';