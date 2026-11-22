-- Health Coach · Push-Mitteilungen
-- Ein Eintrag pro Gerät, das Mitteilungen bekommen soll (auf dem iPhone: App auf dem Home-Bildschirm).
-- Wird nach dem Merge automatisch ausgeführt. Mehrfaches Ausführen schadet nicht.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  remind_at text not null default '07:30',        -- Uhrzeit der Check-in-Erinnerung, HH:MM
  time_zone text not null default 'Europe/Berlin',
  checkin_reminder boolean not null default true,
  last_sent_on date,                              -- Tag der letzten Erinnerung (nur eine pro Tag)
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "nur eigene Daten" on public.push_subscriptions;
create policy "nur eigene Daten" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
revoke all on public.push_subscriptions from anon;

-- Der Zeitplan für die Erinnerung steht in 20261122180000_push_zeitplan.sql.
