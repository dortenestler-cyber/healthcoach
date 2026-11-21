-- Hauttemperatur: nächtliche Abweichung vom persönlichen Normalwert in °C (Garmin „Avg Skin Temp Change“)
alter table public.garmin_daily add column if not exists skin_temp_delta numeric(4, 2);
