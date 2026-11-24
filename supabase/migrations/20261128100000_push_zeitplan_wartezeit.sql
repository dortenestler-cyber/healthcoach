-- Health Coach · Zeitplan der Check-in-Erinnerung wartet länger (freigegeben am 24.11.)
-- Die Funktion "push" braucht beim Aufwachen manchmal mehr als 5 Sekunden (Standard von pg_net).
-- Der Zeitplan brach dann ab, bevor die Erinnerung verschickt war. Jetzt wartet er bis zu 60 Sekunden.
-- Sonst wie in 20261122180000_push_zeitplan.sql. Ändert keine Daten. Mehrfaches Ausführen schadet nicht.

select cron.unschedule(jobid) from cron.job where jobname = 'health-coach-push';

select cron.schedule('health-coach-push', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://fkvhuxjsdvssmupewwgl.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{"action":"due"}'::jsonb,
    timeout_milliseconds := 60000
  )
  from vault.decrypted_secrets s
  where s.name = 'push_cron_secret';
$job$);
