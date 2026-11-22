-- Health Coach · Belastung aus dem Alltag (Konzept docs/konzept-korridore-alltagslast.md, Teil B)
-- Darf mehrfach laufen.

-- Tageswerte
-- Puls alle 15 Minuten ab Mitternacht (96 Werte, Mittel je Viertelstunde), nur für die Anzeige
alter table public.garmin_daily add column if not exists hr_curve smallint[];
-- Minuten je Pulszone und Pulspunkte, getrennt nach Training und Alltag (Aufbau siehe lib/alltagslast.ts)
alter table public.garmin_daily add column if not exists load_daily_min jsonb;
-- Aus der Tageszusammenfassung von Garmin
alter table public.garmin_daily add column if not exists active_kcal integer;
alter table public.garmin_daily add column if not exists active_s integer;
alter table public.garmin_daily add column if not exists highly_active_s integer;
-- Schritte außerhalb von Garmin-Aktivitäten
alter table public.garmin_daily add column if not exists steps_outside_acts integer;

-- Aktivitäten: Schritte und Pulspunkte während der Einheit
-- (Pulspunkte dienen dem persönlichen Umrechnungsfaktor Pulspunkte → Garmin-Last)
alter table public.garmin_activities add column if not exists steps integer;
alter table public.garmin_activities add column if not exists hr_points real;
