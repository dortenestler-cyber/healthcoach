-- Health Coach · Intensitätsminuten je Einheit (freigegeben 25.11.)
-- Je Garmin-Aktivität Garmins eigene Intensitätsminuten (moderat, intensiv), so wie Garmin sie für die Einheit zählt.
-- Die App zählt jede Trainingsminute mindestens moderat und braucht dafür, was Garmin schon gezählt hat.
-- garmin-sync füllt beide Spalten aus der Aktivitätenliste. Mehrfaches Ausführen schadet nicht.

alter table public.garmin_activities add column if not exists im_moderate smallint;
alter table public.garmin_activities add column if not exists im_vigorous smallint;

notify pgrst, 'reload schema';
