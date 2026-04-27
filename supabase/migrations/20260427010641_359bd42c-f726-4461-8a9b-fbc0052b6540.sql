-- Asignar estación 0 a filas existentes sin station_index para no romper la nueva unicidad
UPDATE public.blocked_slots SET station_index = 0 WHERE station_index IS NULL;

-- Eliminar la unicidad antigua que impedía bloquear varias estaciones a la misma hora
ALTER TABLE public.blocked_slots
  DROP CONSTRAINT IF EXISTS blocked_slots_professional_id_slot_date_slot_time_key;

-- Nueva unicidad: una fila por (profesional, fecha, hora, estación)
ALTER TABLE public.blocked_slots
  ADD CONSTRAINT blocked_slots_pro_date_time_station_key
  UNIQUE (professional_id, slot_date, slot_time, station_index);