-- Lavadero "dejá y retirá": campos en service_requests
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS dropoff_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_time time,
  ADD COLUMN IF NOT EXISTS pickup_time time,
  ADD COLUMN IF NOT EXISTS service_window_start time,
  ADD COLUMN IF NOT EXISTS service_window_end time;

-- Lugares de estacionamiento (solo lavaderos)
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS parking_spots integer NOT NULL DEFAULT 0;

-- Permitir slot_status = 'parking' (los CHECK constraints existentes no lo bloquean,
-- pero documentamos los valores válidos via comment).
COMMENT ON COLUMN public.blocked_slots.slot_status IS
  'pending | manual_block | confirmed | parking — parking indica auto esperando en sitio (lavadero dropoff)';