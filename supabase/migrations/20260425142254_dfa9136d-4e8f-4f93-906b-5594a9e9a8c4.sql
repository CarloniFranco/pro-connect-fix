ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS locality TEXT NOT NULL DEFAULT '';

-- Backfill: para Franco (y futuros), si tiene neighborhood lo copio a locality y le pongo Mendoza
UPDATE public.professional_profiles
SET province = 'Mendoza',
    locality = COALESCE(NULLIF(neighborhood, ''), '')
WHERE province = '' AND neighborhood IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pro_province_locality
ON public.professional_profiles (province, locality);