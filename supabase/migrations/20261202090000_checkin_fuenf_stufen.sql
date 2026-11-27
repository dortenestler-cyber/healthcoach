-- Health Coach · Check-in mit 5 Stufen und Check-out am Abend (Wunsch der Nutzerin 27.11.)
-- 1. energy, sleep, mood gelten jetzt von 1 (sehr niedrig) bis 5 (sehr gut). Alte Werte: 1 → 1, 2 → 3, 3 → 5.
-- 2. Neue Spalten energy_evening und mood_evening (1 bis 5) für den Check-out am Abend, im selben Tageseintrag.
-- Das Umrechnen läuft nur einmal, solange die alte Regel (bis 3) noch gilt. Mehrfaches Ausführen schadet nicht.
-- Zugriffsschutz gilt wie für die Tabelle. Die Uhr schickt weiter 1 bis 3, die Funktion `watch` rechnet auf 1, 3, 5 um.

do $$
declare c text;
begin
  if exists (select 1 from pg_constraint where conrelid = 'public.checkins'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%<= 3%') then
    for c in select conname from pg_constraint where conrelid = 'public.checkins'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%<= 3%' loop
      execute format('alter table public.checkins drop constraint %I', c);
    end loop;
    update public.checkins set
      energy = case energy when 1 then 1 when 2 then 3 when 3 then 5 end,
      sleep = case sleep when 1 then 1 when 2 then 3 when 3 then 5 end,
      mood = case mood when 1 then 1 when 2 then 3 when 3 then 5 end;
    alter table public.checkins add constraint checkins_energy_check check (energy between 1 and 5);
    alter table public.checkins add constraint checkins_sleep_check check (sleep between 1 and 5);
    alter table public.checkins add constraint checkins_mood_check check (mood between 1 and 5);
  end if;
end $$;

alter table public.checkins add column if not exists energy_evening smallint check (energy_evening between 1 and 5);
alter table public.checkins add column if not exists mood_evening smallint check (mood_evening between 1 and 5);

notify pgrst, 'reload schema';
