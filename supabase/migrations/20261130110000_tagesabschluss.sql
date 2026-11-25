-- Health Coach · Tagesabschluss am Abend (freigegeben 25.11.)
-- 1. Schalter je Gerät: evening_push (an), evening_at (Uhrzeit HH:MM, Standard 21:00), evening_sent_on (einmal am Tag).
-- 2. Abruf tagsüber: um 19:37, 20:37 und 21:37 Uhr ein voller Abruf von heute statt des kurzen,
--    damit die Belastung aus dem Alltag für den Abschluss stimmt. Sonst wie 20261130100000_tagesstart_training.
-- Zugriffsschutz gilt wie für die Tabelle. Mehrfaches Ausführen schadet nicht.

alter table public.push_subscriptions add column if not exists evening_push boolean not null default true;
alter table public.push_subscriptions add column if not exists evening_at text not null default '21:00';
alter table public.push_subscriptions add column if not exists evening_sent_on date;

create or replace function public.garmin_day_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  berlin timestamp := now() at time zone 'Europe/Berlin';
  hr int := extract(hour from berlin);
  mi int := extract(minute from berlin);
  key text;
  full_run boolean;
begin
  if hr < 6 or hr >= 22 then
    return;
  end if;
  full_run := hr between 19 and 21 and mi between 30 and 44;
  select decrypted_secret into key from vault.decrypted_secrets where name = 'garmin_cron_key';
  perform net.http_post(
    url := 'https://fkvhuxjsdvssmupewwgl.supabase.co/functions/v1/garmin-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', key),
    body := case when full_run then jsonb_build_object('days', 1) else jsonb_build_object('quick', true) end,
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.garmin_day_tick() from public, anon, authenticated;

notify pgrst, 'reload schema';
