-- Add location fields
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS neighborhood text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_maps_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vehicle_types text[] NOT NULL DEFAULT ARRAY['Sedán','SUV','Camioneta']::text[];

-- Migrate `services` from text[] to jsonb [{name, prices:{}}]
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS services_v2 jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.professional_profiles
SET services_v2 = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('name', s, 'prices', '{}'::jsonb))
    FROM unnest(services) AS s
  ),
  '[]'::jsonb
)
WHERE services_v2 = '[]'::jsonb AND array_length(services, 1) IS NOT NULL;

ALTER TABLE public.professional_profiles DROP COLUMN services;
ALTER TABLE public.professional_profiles RENAME COLUMN services_v2 TO services;