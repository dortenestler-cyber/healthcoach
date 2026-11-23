-- Schlafphasen mit Uhrzeit (Zeitachse, z. B. Wachphasen in der Nacht) und Fehlersuche Hauttemperatur
-- Läuft nach dem Merge automatisch (Workflow „Supabase-Migrationen ausführen“). Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), neue Spalten fallen darunter.
-- sleep_levels: { start_min: Einschlafen als Ortszeit-Minute (wie sleep_start_min),
--                 seg: [[ab Minute seit Beginn, Dauer in Minuten, Phase]] } mit Phase d = Tief, l = Leicht, r = REM, w = Wach
alter table public.garmin_daily add column if not exists sleep_levels jsonb;
-- sleep_detail_diag: nur Feldnamen und Ja/Nein-Angaben aus der Garmin-Antwort, keine Messwerte. Wird später wieder entfernt.
alter table public.garmin_daily add column if not exists sleep_detail_diag jsonb;
