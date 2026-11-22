-- Health Coach · Wadenzucken und Wadenkrämpfe
-- Jeder Eintrag einzeln, mit Intensität (1 Zucken · 2 Krampf · 3 starker Krampf).
-- Meist abends: Ein Eintrag nach Mitternacht zählt zum Abend davor (Spalte day).
-- Zugriffsschutz pro Konto wie bei allen Tabellen. Mehrfaches Ausführen schadet nicht.

create table if not exists public.muscle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  day date not null default current_date,
  intensity smallint not null default 2 check (intensity between 1 and 3),
  side text not null default 'beide' check (side in ('links', 'rechts', 'beide')),
  spot text not null default 'wade' check (spot in ('wade', 'fuss', 'oberschenkel', 'andere')),
  situation text not null default 'abends' check (situation in ('abends', 'tagsueber', 'training', 'nach_training', 'nachts')),
  duration text check (duration in ('sekunden', 'minute', 'laenger')),
  swelling boolean not null default false,      -- Schwellung, Rötung oder Wärme: ärztlich abklären
  numbness boolean not null default false,      -- Schwäche oder Taubheit: ärztlich abklären
  note text,
  source text not null default 'app' check (source in ('app', 'uhr'))
);
create index if not exists muscle_events_user_day on public.muscle_events (user_id, day desc);

alter table public.muscle_events enable row level security;
drop policy if exists "nur eigene Daten" on public.muscle_events;
create policy "nur eigene Daten" on public.muscle_events for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.muscle_events to authenticated;
revoke all on public.muscle_events from anon;
