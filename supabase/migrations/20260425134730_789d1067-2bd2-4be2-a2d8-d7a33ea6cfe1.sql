UPDATE public.professional_profiles
SET lat = -32.8605883, lng = -68.8825338
WHERE user_id = '7a86ac22-27bb-49fe-b54e-209461b1585d'
  AND (lat IS NULL OR lng IS NULL);