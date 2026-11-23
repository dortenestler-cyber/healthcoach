-- Health Coach · Nachgeholte Spalten aus der Sammelliste Oberfläche (freigegeben am 23.11., AUFGABEN.md)
-- Punkt 6: eigene Sportart für Garmin-Aktivitäten
--   sport_override  karate, kettlebell, klettern, ausdauer, sonstiges oder ignorieren (= nicht zuordnen); null = wie bei Garmin
--   sport_label     eigener Name bei „Anderes“, z. B. Yoga
-- Punkt 10: Eisprung-Zeichen im Tagebuch
--   ovulation_signs test, mittelschmerz, schleim, temperatur (mehrere möglich)
-- garmin-sync schreibt diese Spalten nie, sein Upsert lässt sie stehen. Zugriffsschutz gilt wie für die Tabellen.
-- Mehrfaches Ausführen schadet nicht.

alter table public.garmin_activities add column if not exists sport_override text;
alter table public.garmin_activities add column if not exists sport_label text;
alter table public.diary_entries add column if not exists ovulation_signs text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_sport_override_check') then
    alter table public.garmin_activities add constraint garmin_activities_sport_override_check
      check (sport_override is null or sport_override in ('karate', 'kettlebell', 'klettern', 'ausdauer', 'sonstiges', 'ignorieren'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_sport_label_check') then
    alter table public.garmin_activities add constraint garmin_activities_sport_label_check
      check (sport_label is null or char_length(sport_label) <= 40);
  end if;
end $$;

-- PostgREST lädt das Schema neu, damit die App die Spalten sofort findet
notify pgrst, 'reload schema';
