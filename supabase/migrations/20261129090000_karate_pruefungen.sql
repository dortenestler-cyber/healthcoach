-- Health Coach · Karate-Prüfungen 5. bis 1. Kyu (freigegeben am 25.11., docs/konzept-karate-pruefungen.md)
-- 1. Neue Tabelle karate_progress: Stand je Punkt des Prüfungsprogramms (Kennung aus lib/karate/programm.ts)
-- 2. karate_items (eigene Punkte): Kyu, drei Stufen statt Haken, Gruppen „Anwendung“ und „Begriffe“
-- Mehrfaches Ausführen schadet nicht.

create table if not exists public.karate_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_key text not null,
  status text not null check (status in ('offen', 'uebe', 'sitzt')),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.karate_items add column if not exists kyu smallint not null default 5 check (kyu between 1 and 5);
alter table public.karate_items add column if not exists status text not null default 'offen' check (status in ('offen', 'uebe', 'sitzt'));
update public.karate_items set status = 'sitzt' where done and status = 'offen';

alter table public.karate_items drop constraint if exists karate_items_category_check;
alter table public.karate_items add constraint karate_items_category_check
  check (category in ('Kihon', 'Kata', 'Anwendung', 'Kumite', 'Begriffe', 'Sonstiges'));

alter table public.karate_progress enable row level security;
drop policy if exists "nur eigene Daten" on public.karate_progress;
create policy "nur eigene Daten" on public.karate_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.karate_progress to authenticated;
revoke all on public.karate_progress from anon;
