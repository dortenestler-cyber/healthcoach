-- Health Coach · Training im Kalender erfassen, Wochenvorlage entfällt (freigegeben am 24.11.)
-- 1. Dauer und eigene Anstrengung je Einheit, für Einheiten ohne Uhr (zählen in Trainingstagen und Muskelbelastung)
-- 2. Offene, noch nicht stattgefundene Einheiten aus der Wochenvorlage löschen (Wunsch der Nutzerin)
-- Mehrfaches Ausführen schadet nicht.

alter table public.planned_sessions add column if not exists duration_min smallint check (duration_min between 1 and 600);
alter table public.planned_sessions add column if not exists rpe smallint check (rpe between 1 and 10);

delete from public.planned_sessions where source = 'vorlage' and status = 'geplant' and day >= current_date;
