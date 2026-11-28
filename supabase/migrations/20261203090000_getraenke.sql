-- Health Coach · Getränke erfassen (Freigabe der Nutzerin 28.11.)
-- Jeder Eintrag einzeln mit Uhrzeit, von Uhr oder App. Mengen: Wasser in Litern, Kaffee und Tee in Tassen, Alkohol in Gläsern.
-- Aus dem Log werden die Tages-Haken „Koffein nach 14 Uhr“ (Kaffee ab 14:00 Berlin) und „Alkohol“ gesetzt.
-- „Wenig getrunken“ bleibt ein Handeintrag. Dazu die Erinnerung nach 3 Stunden ohne Getränk (push_subscriptions).
-- Zugriffsschutz pro Konto. Mehrfaches Ausführen schadet nicht.

create table if not exists public.drink_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  day date not null,
  kind text not null check (kind in ('wasser', 'kaffee', 'tee', 'alkohol')),
  amount numeric(5, 2) not null check (amount > 0 and amount <= 20),
  source text not null default 'app' check (source in ('app', 'uhr'))
);
create index if not exists drink_log_user_day on public.drink_log (user_id, day);
create index if not exists drink_log_user_at on public.drink_log (user_id, at desc);

alter table public.drink_log enable row level security;
drop policy if exists "nur eigene Daten" on public.drink_log;
create policy "nur eigene Daten" on public.drink_log for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.drink_log to authenticated;
revoke all on public.drink_log from anon;

-- Haken des Tages aus dem Log: setzt fehlende Haken; nimmt sie nur zurück, wenn ein Eintrag geändert oder gelöscht wurde
create or replace function public.drink_sync_day(p_user uuid, p_day date, p_remove boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_k boolean;
  has_a boolean;
  cur text[];
begin
  select
    exists (select 1 from public.drink_log where user_id = p_user and day = p_day and kind = 'kaffee'
            and extract(hour from at at time zone 'Europe/Berlin') >= 14),
    exists (select 1 from public.drink_log where user_id = p_user and day = p_day and kind = 'alkohol')
  into has_k, has_a;
  if not (has_k or has_a or p_remove) then
    return;
  end if;
  insert into public.diary_entries (user_id, day) values (p_user, p_day) on conflict (user_id, day) do nothing;
  select influences into cur from public.diary_entries where user_id = p_user and day = p_day;
  cur := coalesce(cur, '{}');
  if has_k and not ('koffein_nach_14' = any (cur)) then cur := array_append(cur, 'koffein_nach_14'); end if;
  if has_a and not ('alkohol' = any (cur)) then cur := array_append(cur, 'alkohol'); end if;
  if p_remove and not has_k then cur := array_remove(cur, 'koffein_nach_14'); end if;
  if p_remove and not has_a then cur := array_remove(cur, 'alkohol'); end if;
  update public.diary_entries set influences = cur, updated_at = now() where user_id = p_user and day = p_day;
end $$;
revoke all on function public.drink_sync_day(uuid, date, boolean) from public, anon, authenticated;

create or replace function public.drink_log_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.drink_sync_day(new.user_id, new.day, false);
  elsif tg_op = 'DELETE' then
    perform public.drink_sync_day(old.user_id, old.day, true);
  else
    perform public.drink_sync_day(new.user_id, new.day, true);
    if old.day is distinct from new.day then
      perform public.drink_sync_day(old.user_id, old.day, true);
    end if;
  end if;
  return null;
end $$;
revoke all on function public.drink_log_after() from public, anon, authenticated;

drop trigger if exists drink_log_sync on public.drink_log;
create trigger drink_log_sync after insert or update or delete on public.drink_log
  for each row execute function public.drink_log_after();

-- Erinnerung nach 3 Stunden ohne Getränk (Funktion push, Aktion due, zwischen 8 und 20 Uhr)
alter table public.push_subscriptions add column if not exists drink_push boolean not null default true;
alter table public.push_subscriptions add column if not exists drink_sent_at timestamptz;

notify pgrst, 'reload schema';
