-- Health Coach · Zyklus aus Garmin und täglicher Abruf am Morgen
-- Ausführen: einmal komplett im SQL-Editor von Supabase einfügen und auf "Run" klicken.
-- Mehrfaches Ausführen schadet nicht.

-- 1. Zyklen aus Garmin: eine Zeile pro Zyklusbeginn
create table if not exists public.garmin_cycles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,          -- erster Tag der Periode laut Garmin
  period_length smallint,            -- Länge der Periode in Tagen laut Garmin
  synced_at timestamptz not null default now(),
  primary key (user_id, start_date)
);

-- 2. Protokoll der automatischen Abrufe am Morgen
create table if not exists public.garmin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null,
  message text
);
create index if not exists garmin_sync_runs_user_at on public.garmin_sync_runs (user_id, at desc);

alter table public.garmin_cycles enable row level security;
alter table public.garmin_sync_runs enable row level security;

drop policy if exists "nur eigene Daten" on public.garmin_cycles;
create policy "nur eigene Daten" on public.garmin_cycles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Das Protokoll kann die Nutzerin nur lesen; geschrieben wird es von der Funktion garmin-sync
drop policy if exists "nur eigene Daten lesen" on public.garmin_sync_runs;
create policy "nur eigene Daten lesen" on public.garmin_sync_runs for select to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.garmin_cycles to authenticated;
grant select on public.garmin_sync_runs to authenticated;
revoke all on public.garmin_cycles, public.garmin_sync_runs from anon;

-- 3. Geheimer Schlüssel für den Zeitplan, sicher im Vault von Supabase.
--    Er wird hier einmal zufällig erzeugt; du musst ihn nirgends eintragen.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'garmin_cron_key') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'garmin_cron_key', 'Schlüssel für den Garmin-Abruf am Morgen');
  end if;
end $$;

-- Prüft den Schlüssel; nur die Funktion garmin-sync (Service-Role) darf fragen
create or replace function public.garmin_cron_key_ok(k text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'garmin_cron_key' and decrypted_secret = k);
$$;
revoke all on function public.garmin_cron_key_ok(text) from public, anon, authenticated;
grant execute on function public.garmin_cron_key_ok(text) to service_role;

-- 4. Zeitplan: jeden Morgen um 6:15 Uhr deutscher Zeit
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Der Zeitplan läuft in UTC. Damit 6:15 Uhr im Winter und im Sommer stimmt,
-- läuft er um 4:15, 5:15 und 6:15 UTC und prüft selbst die deutsche Uhrzeit.
-- Um 6:15 Uhr wird abgerufen. Um 7:15 Uhr nur noch einmal, wenn es um 6:15 Uhr nicht geklappt hat.
create or replace function public.garmin_morning_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  berlin timestamp := now() at time zone 'Europe/Berlin';
  hr int := extract(hour from berlin);
  key text;
begin
  if hr = 7 and exists (
    select 1 from public.garmin_sync_runs
    where ok and (at at time zone 'Europe/Berlin')::date = berlin::date
  ) then
    return;
  end if;
  if hr not in (6, 7) then
    return;
  end if;
  select decrypted_secret into key from vault.decrypted_secrets where name = 'garmin_cron_key';
  perform net.http_post(
    url := 'https://fkvhuxjsdvssmupewwgl.supabase.co/functions/v1/garmin-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', key),
    body := jsonb_build_object('days', 3),
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.garmin_morning_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'garmin-morgen') then
    perform cron.unschedule('garmin-morgen');
  end if;
  perform cron.schedule('garmin-morgen', '15 4,5,6 * * *', 'select public.garmin_morning_tick()');
end $$;
