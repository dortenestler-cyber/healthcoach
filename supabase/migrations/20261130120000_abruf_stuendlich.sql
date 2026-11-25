-- Health Coach · Voller Garmin-Abruf jede Stunde (freigegeben 25.11.)
-- garmin_day_tick: zwischen 6 und 22 Uhr (Berlin) zur Minute 37 ein voller Abruf von heute ({days: 1}),
-- zu den Minuten 7, 22 und 52 der kurze ({quick: true}). Vorher gab es den vollen Abruf nur um 19:37, 20:37, 21:37.
-- Zeitplan garmin-tagsueber bleibt unverändert. Mehrfaches Ausführen schadet nicht.

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
  full_run := mi between 30 and 44;
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
