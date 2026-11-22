-- Schlafphasen pro Nacht in Sekunden (Garmin: Tief-, REM-, Leichtschlaf und Wachzeit)
-- Ausführen: einmal im SQL-Editor von Supabase einfügen und auf "Run" klicken. Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), neue Spalten fallen darunter.
alter table public.garmin_daily add column if not exists sleep_deep_s integer;
alter table public.garmin_daily add column if not exists sleep_rem_s integer;
alter table public.garmin_daily add column if not exists sleep_light_s integer;
alter table public.garmin_daily add column if not exists sleep_awake_s integer;
