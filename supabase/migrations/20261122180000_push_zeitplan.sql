-- Health Coach · Zeitplan für die Check-in-Erinnerung
-- Alle 15 Minuten fragt die Datenbank die Funktion "push", ob Erinnerungen fällig sind.
-- Das Passwort für diesen Aufruf liegt im Supabase-Tresor (Vault) unter dem Namen "push_cron_secret",
-- nicht in dieser Datei. Es muss gleich sein wie das Edge-Function-Secret PUSH_CRON_SECRET.
-- Fehlt der Eintrag im Tresor, schickt der Zeitplan nichts ab.
-- Wird nach dem Merge automatisch ausgeführt. Mehrfaches Ausführen schadet nicht.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'health-coach-push';

select cron.schedule('health-coach-push', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://fkvhuxjsdvssmupewwgl.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{"action":"due"}'::jsonb
  )
  from vault.decrypted_secrets s
  where s.name = 'push_cron_secret';
$job$);
