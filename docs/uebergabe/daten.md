# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWeAWsD5W9zcyCuqTGZ (Einrichtung, noch keine eigene DA-Sitzung)

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Migrationen und Funktionen laufen nach dem Merge automatisch (PR #48), alle 17 Migrationen sind ausgeführt, drei ältere PRs warten auf die Nutzerin.

## In Arbeit
Offene PRs, die vor der neuen Arbeitsweise entstanden sind (ohne Kürzel im Titel). Die Rolle Daten übernimmt sie, weil sie Migrationen oder Supabase-Funktionen enthalten:
- PR #45 `claude/readiness-bereich`: Readiness nach dem persönlichen Bereich (App und Uhr). Ändert die Funktion `watch`, darum merged die Nutzerin.
- PR #47 `claude/garmin-zyklus-morgenabruf`: Zyklus aus Garmin und täglicher Abruf um 6:15 Uhr. Ersetzt PR #14.
- PR #49 `claude/sharp-carson-3lf61w`: Wadenzucken und Wadenkrämpfe (mit Migration).
- Nächster Schritt: Jeden PR mit `main` abgleichen (`git merge origin/main`), Konflikte lösen, `tsc` und `npm run build` prüfen. Achtung: Die Zeitstempel der Migrationen in #47 und #49 müssen nach `20261123100000` liegen, sonst laufen sie in falscher Reihenfolge.

## Wartet auf
- Nutzerin: Merge von PR #45, #47, #49
- Nutzerin: PR #14 schließen (ersetzt durch #47)
- Nutzerin: Secrets für Push und Eintrag `push_cron_secret` im Tresor (`AUFGABEN.md` Abschnitt 3 und 4)

## Für die andere Rolle
- Nichts.

## Fallstricke
- PRs mit Migrationen oder Änderungen an Supabase-Funktionen nie selbst mergen.
- Jede Migration muss mehrfach laufen dürfen (`if not exists` usw.), der Workflow hat am Anfang alle einmal ausgeführt.
- `supabase/setup-cli` mit fester Version, „latest“ scheitert am Abfragelimit von GitHub.

## Erledigt seit letzter Übergabe
- PR #48: Migrationen automatisch ausführen
- PR #51: Atemfrequenz und Stress im Detail, Migrationen `atem_stress` und `gewohnheiten`
