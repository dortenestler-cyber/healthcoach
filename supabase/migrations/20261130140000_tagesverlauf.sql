-- Health Coach · Tagesverlauf aus Zwischenständen (freigegeben 25.11.)
-- Garmin gibt Stress, Schritte und Intensitätsminuten nur als bisherigen Tageswert heraus, nicht als Verlauf.
-- garmin-sync speichert bei jedem Abruf (tagsüber alle 15 Minuten) den Stand von heute mit Uhrzeit.
-- Die App rechnet aus dem Unterschied zweier Stände, was dazwischen passiert ist.
-- Zugriffsschutz pro Konto. Mehrfaches Ausführen schadet nicht.

create table if not exists public.garmin_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  day date not null,
  steps integer,
  intensity_minutes smallint,
  stress_avg smallint,
  stress_rest_s integer,
  stress_low_s integer,
  stress_medium_s integer,
  stress_high_s integer,
  primary key (user_id, at)
);
create index if not exists garmin_snapshots_user_day on public.garmin_snapshots (user_id, day);

alter table public.garmin_snapshots enable row level security;
drop policy if exists "nur eigene Daten" on public.garmin_snapshots;
create policy "nur eigene Daten" on public.garmin_snapshots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.garmin_snapshots to authenticated;
revoke all on public.garmin_snapshots from anon;

notify pgrst, 'reload schema';
