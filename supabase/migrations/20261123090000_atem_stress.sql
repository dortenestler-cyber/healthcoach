-- Atemfrequenz und Stress im Detail (Konzept dunkel 2: Vitalwerte und Stress-Karte auf Heute)
-- Läuft nach dem Merge automatisch (Workflow „Supabase-Migrationen ausführen“). Mehrfaches Ausführen schadet nicht.
-- Die Tabelle hat schon Zugriffsschutz pro Konto (Row Level Security), neue Spalten fallen darunter.
-- respiration_avg: Atemzüge pro Minute im Schlaf
alter table public.garmin_daily add column if not exists respiration_avg real;
-- Sekunden je Stressbereich: Ruhe (0–25), niedrig (26–50), mittel (51–75), hoch (76–100)
alter table public.garmin_daily add column if not exists stress_rest_s integer;
alter table public.garmin_daily add column if not exists stress_low_s integer;
alter table public.garmin_daily add column if not exists stress_medium_s integer;
alter table public.garmin_daily add column if not exists stress_high_s integer;
-- stress_curve: 96 Werte (alle 15 Minuten ab Mitternacht, Ortszeit, höchster Wert im Fenster), null ohne Messwert
alter table public.garmin_daily add column if not exists stress_curve jsonb;
