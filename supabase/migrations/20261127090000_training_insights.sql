-- Health Coach · Training-Insights (Konzept docs/konzept-training-insights.md, freigegeben 23.11.)
-- Je Garmin-Aktivität:
--   hr_zones   Minuten je Pulszone 0–5 (gleiche Zonen wie die Belastung aus dem Alltag)
--   hr_series  Puls im Schnitt je 5 Minuten ab Beginn der Einheit (null = keine Messung)
--   rpe        eigene Anstrengung 1–10, trägt die Nutzerin nach der Einheit ein
-- garmin-sync füllt hr_zones und hr_series aus dem Tagespuls, rpe schreibt nur die App.
-- Zugriffsschutz gilt wie für die ganze Tabelle. Mehrfaches Ausführen schadet nicht.

alter table public.garmin_activities add column if not exists hr_zones jsonb;
alter table public.garmin_activities add column if not exists hr_series jsonb;
alter table public.garmin_activities add column if not exists rpe smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_rpe_check') then
    alter table public.garmin_activities add constraint garmin_activities_rpe_check check (rpe is null or rpe between 1 and 10);
  end if;
end $$;
