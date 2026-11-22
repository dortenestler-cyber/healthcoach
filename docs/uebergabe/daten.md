# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWdtTj7aEt1xwucQpp1

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Alltagslast läuft: Tagespuls kommt an, 21 Tage berechnet. Bewegung im Alltag, aktive Zeit und Schritte je Training fehlen noch, PR #67 (Fehlersuche) wartet auf den Merge.

## In Arbeit
- PR #63 (gemergt): Migration `20261124090000_alltagslast.sql`, `garmin-sync` mit Tagespuls, Zonen, Training/Alltag, Umrechnungsfaktor, Nachberechnung 90 Tage (bis zu 21 Tage je Abruf). Rechenteil in `supabase/functions/garmin-sync/alltag.ts`, Aufbau für die App in `lib/alltagslast.ts`.
  Ergebnis erster Abruf („Daten prüfen“, 22.11. 19:55): 21 von 70 Tagen berechnet, alle aus Puls, Faktor 0,62 aus 6 Trainings, Maximalpuls aus Aktivitäten. Aber `bewegung` überall „keine“ (Schrittverlauf und Stress liefern nichts), `active_s`/`active_kcal` leer, `garmin_activities.steps` leer.
- PR #67: `garmin-sync` speichert am neuesten Tag in `load_daily_min.diag` nur Feldnamen und Fehlermeldungen von Garmin. Nächster Schritt nach Merge und Abruf: Ablauf „Daten prüfen“ starten (`actions_run_trigger`, `daten-pruefen.yml`), Feldnamen lesen, Felder in `garmin-sync` korrigieren, danach `diag` wieder entfernen.
- Danach: Readiness der Uhr (`supabase/functions/watch/target.ts`) an die App angleichen (Bereiche je Zyklusphase, Schlaf zyklusabhängig, kranke Tage raus), Wunsch der Oberfläche. Noch nicht begonnen.

## Wartet auf
- Nutzerin: Merge von PR #67, dann Synchronisieren und Bescheid geben (`AUFGABEN.md` Abschnitt 14)
- Nutzerin: Secrets für Push und Eintrag `push_cron_secret` im Tresor (`AUFGABEN.md` Abschnitt 3 und 4)
- Nutzerin: Rückmeldung, ob der Morgen-Abruf um 6:15 Uhr geklappt hat (`AUFGABEN.md` Abschnitt 9). Wenn nicht: Tabelle `garmin_sync_runs` und Zeitplan in `pg_cron` prüfen
- Nutzerin: Rückmeldung, ob Atemfrequenz und Stress im Tagesverlauf ankommen (`AUFGABEN.md` Abschnitt 11)

## Für die andere Rolle
- Oberfläche: PR #63 ist gemergt (Migration grün). Ab dem nächsten Abruf liegt die Alltagslast in `garmin_daily.load_daily_min` (Typ und `readLoadDay` in `lib/alltagslast.ts`). Tageslast = `last_training + last_alltag` (gleiche Einheit wie Garmin-Last, ÷ 150 = %). `quelle: "schritte"` heißt „geschätzt aus Schritten“. Außerdem neu: `hr_curve` (96 Werte), `steps_outside_acts`, `active_s`, `highly_active_s`, `active_kcal`. `faktor = null` heißt: noch Startwert (unter 3 Trainings mit Puls). Für Einstellungen: `LOAD_ZONES`, `puls_ruhe`, `puls_max`, `puls_max_quelle`.
- Oberfläche: `lib/insights.ts` `loadPercent` und `lib/today.ts` `loadByDay` sind deine (Teil B Anzeige), ich ändere sie nicht.

## Fallstricke
- Datenbank lesen ohne eigenen Zugang: Ablauf „Daten prüfen“ (`.github/workflows/daten-pruefen.yml`, PR #66) von Hand starten, er gibt nur Zählwerte aus. Abfragen dort ergänzen, nie Gesundheitswerte ausgeben.
- PRs mit Migrationen oder Änderungen an Supabase-Funktionen nie selbst mergen.
- Neue Migrationen brauchen einen Zeitstempel nach `20261124090000` (die letzte). Vor dem Anlegen `ls supabase/migrations | tail -1` prüfen.
- Jede Migration muss mehrfach laufen dürfen (`if not exists` usw.), der Workflow hat am Anfang alle einmal ausgeführt.
- `garmin-sync` läuft ohne JWT-Prüfung am Eingang (Einstellung im Workflow) und prüft Login oder Server-Schlüssel selbst. Nicht zurückdrehen, sonst scheitert der Morgen-Abruf.
- `supabase/setup-cli` mit fester Version, „latest“ scheitert am Abfragelimit von GitHub.
- Supabase liegt in Irland (`eu-west-1`), nicht in Frankfurt (PR #55).
- Funktion prüfen: `deno` per `npm i -g deno`, dann in einer Kopie mit `deno.json` `{"nodeModulesDir":"auto"}` `deno check index.ts` (im Repo fehlt die Einstellung). Es gibt kein `package-lock.json`: `npm install` statt `npm ci`, die erzeugte Sperrdatei nicht committen.
- Die Pfade für Tagespuls und Schrittverlauf der Garmin Personal API sind nicht dokumentiert, es werden Pfade aus Garmin Connect versucht. Ohne Schrittverlauf erkennt `garmin-sync` Bewegung am Stresswert −2, ohne beides zählt der Alltag erst ab Zone 2.

## Erledigt seit letzter Übergabe
- PR #66 gemergt: Ablauf „Daten prüfen“ (nur lesend)
- PR #63 gemergt: Alltagslast Daten, Migration `20261124090000_alltagslast.sql` und Upload von `garmin-sync` grün
