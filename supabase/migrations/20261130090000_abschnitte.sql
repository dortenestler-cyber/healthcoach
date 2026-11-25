-- Health Coach · Abschnitte aus dem Puls (freigegeben 25.11.)
-- Je Garmin-Aktivität:
--   hr_fine        Puls im Schnitt je 5 Sekunden ab Beginn (null = keine Messung, [] = Garmin liefert keinen)
--   garmin_sets    Sätze aus Garmins Satzerkennung: [{s, d, r}] Beginn in s ab Start, Dauer in s, Wiederholungen
--   segment_count  bestätigte Zahl der Abschnitte (Versuche, Sätze, Runden, Intervalle), schreibt nur die App
-- garmin-sync füllt hr_fine und garmin_sets, sein Upsert lässt segment_count stehen.
-- Zugriffsschutz gilt wie für die ganze Tabelle. Mehrfaches Ausführen schadet nicht.

alter table public.garmin_activities add column if not exists hr_fine jsonb;
alter table public.garmin_activities add column if not exists garmin_sets jsonb;
alter table public.garmin_activities add column if not exists segment_count smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_segment_count_check') then
    alter table public.garmin_activities add constraint garmin_activities_segment_count_check
      check (segment_count is null or segment_count between 0 and 200);
  end if;
end $$;

notify pgrst, 'reload schema';
