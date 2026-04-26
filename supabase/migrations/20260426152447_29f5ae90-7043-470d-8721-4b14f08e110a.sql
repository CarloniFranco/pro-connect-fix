-- Corregir coordenadas del Lavadero SCRUM (Boulogne Sur Mer 598, Las Heras, Mendoza)
UPDATE public.professional_profiles
SET lat = -32.8632025,
    lng = -68.8586698,
    updated_at = now()
WHERE full_name = 'LAVADERO SCRUM'
  AND user_id = '6d341d10-0e16-4c94-817e-53fb4b462459';