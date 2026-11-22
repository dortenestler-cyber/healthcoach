-- Energie über den Tag (Seite Muster): Body Battery im Tagesverlauf und Schlafzeiten
-- Ausführen: einmal im SQL-Editor von Supabase einfügen und auf "Run" klicken. Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), neue Spalten fallen darunter.
-- bb_curve: 96 Werte (alle 15 Minuten ab Mitternacht, Ortszeit), null wenn kein Messwert
alter table public.garmin_daily add column if not exists bb_curve jsonb;
-- Schlaf der Nacht, die an diesem Tag endet: Minuten seit Mitternacht (Einschlafen ggf. am Vortag)
alter table public.garmin_daily add column if not exists sleep_start_min smallint;
alter table public.garmin_daily add column if not exists sleep_end_min smallint;
