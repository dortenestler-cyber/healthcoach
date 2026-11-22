-- Fitness-Alter aus Garmin für das Zifferblatt
-- Ausführen: einmal im SQL-Editor von Supabase einfügen und auf "Run" klicken. Mehrfaches Ausführen schadet nicht.
alter table public.garmin_daily add column if not exists fitness_age smallint;
