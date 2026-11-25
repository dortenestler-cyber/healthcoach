-- Health Coach · Garmins eigenen Schlafwert entfernen (Nutzerin 25.11., docs/konzept-schlafqualitaet.md)
-- App und Uhr rechnen den Schlafwert selbst aus den Garmin-Schlafdaten (lib/schlaf.ts, functions/watch/schlaf.ts).
-- garmin-sync schreibt die Spalte seit PR #171 nicht mehr. Mehrfaches Ausführen schadet nicht.
alter table public.garmin_daily drop column if exists sleep_score;
