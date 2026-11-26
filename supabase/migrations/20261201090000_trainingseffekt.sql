-- Health Coach · Trainingseffekt je Einheit (Prüfaudit 26.11.2026, Empfehlung 15, freigegeben)
-- Garmins aeroben und anaeroben Trainingseffekt (0–5) je Aktivität speichern, wenn die Aktivitätenliste ihn liefert.
-- garmin-sync füllt beide Spalten aus aerobicTrainingEffect und anaerobicTrainingEffect. Mehrfaches Ausführen schadet nicht.

alter table public.garmin_activities add column if not exists te_aerobic numeric(2,1);
alter table public.garmin_activities add column if not exists te_anaerobic numeric(2,1);

notify pgrst, 'reload schema';
