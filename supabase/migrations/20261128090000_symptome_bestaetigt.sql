-- Health Coach · Symptome von gestern bestätigen (freigegeben am 24.11.)
-- Im Morgen-Check-in fragt die App: „Gestern hattest du … Wie ist es heute?“ (Noch da · Besser · Weg).
--   symptoms_checked  true = für diesen Tag beantwortet. Dann zählen nur die Symptome dieses Tages,
--                     auch wenn es keine sind („Weg“). Ohne Antwort zählen die von gestern halb.
-- garmin-sync schreibt diese Spalte nie. Zugriffsschutz gilt wie für die Tabelle.
-- Mehrfaches Ausführen schadet nicht.

alter table public.diary_entries add column if not exists symptoms_checked boolean not null default false;
