-- Health Coach · Gewohnheiten „Sport“ und „Stress“ automatisch aus Garmin (Nutzerin 23.11.)
-- Sport: Garmin-Aktivität ab 20 Minuten (nicht „Nicht zuordnen“) · Stress: Tagesschnitt über dem persönlichen Bereich
-- der 30 Tage davor. garmin-sync setzt beides, auch rückwirkend.
--   auto_set  Gewohnheiten, die garmin-sync gesetzt hat (nimmt er wieder weg, wenn die Bedingung nicht mehr gilt)
--   auto_off  Gewohnheiten, die die Nutzerin an diesem Tag abgewählt hat (setzt garmin-sync nicht wieder)
--   manual    false = Eintrag nur von garmin-sync angelegt; zählt in Auswertungen nicht als eigener Tagebuch-Tag
-- Bestehende Einträge bleiben eigene Einträge (manual = true). Mehrfaches Ausführen schadet nicht.

alter table public.diary_entries add column if not exists auto_set text[] not null default '{}';
alter table public.diary_entries add column if not exists auto_off text[] not null default '{}';
alter table public.diary_entries add column if not exists manual boolean not null default true;

notify pgrst, 'reload schema';
