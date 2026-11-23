-- Wachphasen und Sauerstoffsättigung im Schlaf, Hauttemperatur und Schlaf-Zeitachse entfernen
-- Garmin liefert über die Personal API weder Hauttemperatur noch Schlafphasen mit Uhrzeit (geprüft 23.11.2026).
-- Entscheidung der Nutzerin (23.11.2026): Temperatur vollständig aus der App entfernen.
-- Läuft nach dem Merge automatisch (Workflow „Supabase-Migrationen ausführen“). Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), neue Spalten fallen darunter.

-- awake_count: wie oft wach in der Nacht (Garmin awakeCount)
alter table public.garmin_daily add column if not exists awake_count integer;
-- spo2_avg / spo2_low: Sauerstoffsättigung im Schlaf in %, Durchschnitt und niedrigster Wert
alter table public.garmin_daily add column if not exists spo2_avg real;
alter table public.garmin_daily add column if not exists spo2_low real;

-- Nie befüllt, weil Garmin die Werte nicht liefert
alter table public.garmin_daily drop column if exists skin_temp_delta;
alter table public.garmin_daily drop column if exists sleep_levels;
alter table public.garmin_daily drop column if exists sleep_detail_diag;
