-- Health Coach · Tagesstart und Mitteilung nach dem Training (freigegeben 25.11.)
-- 1. Schalter je Gerät:
--      checkin_reminder  heißt in der App jetzt „Tagesstart“ (Readiness am Morgen statt Check-in-Erinnerung)
--      training_push     Mitteilung, sobald eine neue Einheit von Garmin da ist
--      show_values       Werte in Mitteilungen zeigen (aus: nur ein neutraler Satz auf dem Sperrbildschirm)
-- 2. garmin_activities.notified_at: wann zur Einheit eine Mitteilung ging. Alle bisherigen Einheiten gelten
--    als erledigt, damit nach dem Einspielen keine alten Trainings gemeldet werden.
-- 3. Abruf tagsüber: alle 15 Minuten von 6 bis 22 Uhr deutscher Zeit nur die Aktivitäten von heute.
-- Zugriffsschutz gilt wie für die Tabellen. Mehrfaches Ausführen schadet nicht.

alter table public.push_subscriptions add column if not exists training_push boolean not null default true;
alter table public.push_subscriptions add column if not exists show_values boolean not null default true;

alter table public.garmin_activities add column if not exists notified_at timestamptz;
update public.garmin_activities set notified_at = now() where notified_at is null;

create or replace function public.garmin_day_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hr int := extract(hour from (now() at time zone 'Europe/Berlin'));
  key text;
begin
  if hr < 6 or hr >= 22 then
    return;
  end if;
  select decrypted_secret into key from vault.decrypted_secrets where name = 'garmin_cron_key';
  perform net.http_post(
    url := 'https://fkvhuxjsdvssmupewwgl.supabase.co/functions/v1/garmin-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', key),
    body := jsonb_build_object('quick', true),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function public.garmin_day_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'garmin-tagsueber') then
    perform cron.unschedule('garmin-tagsueber');
  end if;
  perform cron.schedule('garmin-tagsueber', '7,22,37,52 * * * *', 'select public.garmin_day_tick()');
end $$;

notify pgrst, 'reload schema';
