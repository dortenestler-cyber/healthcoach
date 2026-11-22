# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-22 19:00 · Sitzung: https://claude.ai/code/session_014pVPWeAWsD5W9zcyCuqTGZ (Einrichtung, noch keine eigene DA-Sitzung)

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Keine offenen PRs mehr: #45, #47 und #49 sind gemergt, alle 19 Migrationen sind ausgeführt, `garmin-sync` ruft ab jetzt jeden Morgen um 6:15 Uhr ab.

## In Arbeit
- Nichts.

## Wartet auf
- Nutzerin: Secrets für Push und Eintrag `push_cron_secret` im Tresor (`AUFGABEN.md` Abschnitt 3 und 4)
- Nutzerin: Rückmeldung, ob der Morgen-Abruf um 6:15 Uhr geklappt hat (`AUFGABEN.md` Abschnitt 9). Wenn nicht: Tabelle `garmin_sync_runs` und Zeitplan in `pg_cron` prüfen
- Nutzerin: Rückmeldung, ob Atemfrequenz und Stress im Tagesverlauf ankommen (`AUFGABEN.md` Abschnitt 11)

## Für die andere Rolle
- Nichts.

## Fallstricke
- PRs mit Migrationen oder Änderungen an Supabase-Funktionen nie selbst mergen.
- Neue Migrationen brauchen einen Zeitstempel nach `20261123120000` (die letzte). Vor dem Anlegen `ls supabase/migrations | tail -1` prüfen.
- Jede Migration muss mehrfach laufen dürfen (`if not exists` usw.), der Workflow hat am Anfang alle einmal ausgeführt.
- `garmin-sync` läuft ohne JWT-Prüfung am Eingang (Einstellung im Workflow) und prüft Login oder Server-Schlüssel selbst. Nicht zurückdrehen, sonst scheitert der Morgen-Abruf.
- `supabase/setup-cli` mit fester Version, „latest“ scheitert am Abfragelimit von GitHub.
- Supabase liegt in Irland (`eu-west-1`), nicht in Frankfurt (PR #55).

## Erledigt seit letzter Übergabe
- PR #45: Readiness nach dem persönlichen Bereich (App und Uhr), Upload grün
- PR #47: Zyklus aus Garmin, Morgen-Abruf um 6:15 Uhr, Migration `20261123120000_garmin_zyklus_morgenabruf.sql` grün
- PR #49: Wadenzucken und Wadenkrämpfe, Migration `20261123110000_muskeln.sql` grün
- PR #14 geschlossen (ersetzt durch #47)
