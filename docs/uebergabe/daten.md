# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-23 · Sitzung: https://claude.ai/code/session_014pVPWdtTj7aEt1xwucQpp1

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Korridore Teil B Daten ist fertig und läuft (PR #63–#73): Alltagslast aus dem Tagespuls, Readiness der Uhr wie in der App, Morgen-Abruf 6:15 Uhr bestätigt. Push eingerichtet (Secrets, Tresor, Testmitteilung angekommen, 23.11.). Keine offenen PRs.

## In Arbeit
- PR #84 (wartet auf Merge der Nutzerin): je Nacht `dailySleepData` (Pfade `SLEEP_PATHS`), Zeitachse in `sleep_levels`, Hauttemperatur aus der Nacht, Fehlersuche in `sleep_detail_diag` (nur Feldnamen). Nach Merge und Synchronisieren „Daten prüfen“ starten: Abschnitte „Einzelne Nächte“ und „Fehlersuche Schlaf-Detail“. Je nach Ergebnis Feldnamen in `findSkinTemp`/`sleepLevels` anpassen, danach `sleep_detail_diag` wieder entfernen (Spalte bleibt leer oder per Migration löschen).
- Sonst nichts. Nächste mögliche Aufgaben, kein Eilfall:
  - „Energie über den Tag“: `bb_curve` nur an wenigen Tagen. Prüfen, ob der Body-Battery-Pfad nur für kurze Zeiträume antwortet (mit „Daten prüfen“ zählen, Spalte `energiekurve`).
  - Uhr: Belastungsring mit Alltag (Konzept Teil B, „später“), sinnvoll nach Teil B Anzeige der Oberfläche.

## Was Garmin liefert (Personal API, geprüft 22./23.11.)
- Tagespuls: `/wellness-service/wellness/dailyHeartRate?date=` ✓
- Schrittverlauf (`dailySummaryChart`), Stressverlauf (`dailyStress/{Tag}`, `dailyStress?date=`), Profil (`socialProfile`): alle 404. `garmin-sync` versucht Stress je Lauf noch einmal (zwei Abrufe), falls Garmin ihn freischaltet.
- Tageszusammenfassung: `calories.burnedActive` ✓, keine aktive Zeit (`active_s`, `highly_active_s` bleiben leer).
- Hauttemperatur: „Daten prüfen“ 23.11.: 0 von 71 Tagen mit `skin_temp_delta`, noch nie gefunden. Weder die Schlafübersicht (`dailySleepSummariesByDate`) noch der Rückgriff auf einzelne Nächte (`dailySleepData?date=`) liefern ein bekanntes Feld. Die gefundenen Feldnamen mit „temp“ (`sleepTempKeys`) gehen nur an die App und werden nirgends angezeigt oder gespeichert. Vorschlag an die Nutzerin: Feldnamen (ohne Werte) in `garmin_sync_runs` schreiben und `skinTempDataExists` auswerten.
- Schritte je Aktivität: bisher keine (`garmin_activities.steps` leer), Feldname ungeklärt.
- Alltagslast Version 2: ohne Bewegungsdaten zählt Zone 1 ab 10 Minuten am Stück, Zone 2 und höher immer (`bewegung: "dauer"`). Ältere Tage (v1) rechnet jeder Abruf nach.

## Wartet auf
- Nutzerin: Merge von PR #84 und einmal synchronisieren (`AUFGABEN.md` Abschnitt 15). Garmin Connect zeigt die Hauttemperatur-Veränderung (bestätigt 23.11.), die Daten sind also da.

## Für die andere Rolle
- Oberfläche: Wunsch der Nutzerin (23.11.): Wachphasen in der Nacht darstellen. Ab PR #84 liegt in `garmin_daily.sleep_levels` die Zeitachse `{ start_min, seg: [[ab Minute, Dauer, Phase]] }` (Phase `d`/`l`/`r`/`w`). Erst nutzen, wenn „Daten prüfen“ zeigt, dass sie ankommt (steht dann hier). Typ in `lib/garmin.ts` fehlt noch.
- Oberfläche: Dein Wunsch „Readiness der Uhr angleichen“ ist mit PR #70 erledigt (gemergt). Die Stresskurve (`stress_curve`) bleibt leer, Garmin liefert sie nicht: Karte „Stress im Tagesverlauf“ entsprechend erklären. `lib/alltagslast.ts`: `v` kann 1 oder 2 sein, `bewegung` neu „stress“ oder „dauer“ (Zone 1 ab 10 Minuten am Stück).
- Oberfläche: PR #63 ist gemergt (Migration grün). Ab dem nächsten Abruf liegt die Alltagslast in `garmin_daily.load_daily_min` (Typ und `readLoadDay` in `lib/alltagslast.ts`). Tageslast = `last_training + last_alltag` (gleiche Einheit wie Garmin-Last, ÷ 150 = %). `quelle: "schritte"` heißt „geschätzt aus Schritten“. Außerdem neu: `hr_curve` (96 Werte), `steps_outside_acts`, `active_s`, `highly_active_s`, `active_kcal`. `faktor = null` heißt: noch Startwert (unter 3 Trainings mit Puls). Für Einstellungen: `LOAD_ZONES`, `puls_ruhe`, `puls_max`, `puls_max_quelle`.
- Oberfläche: `lib/insights.ts` `loadPercent` und `lib/today.ts` `loadByDay` sind deine (Teil B Anzeige), ich ändere sie nicht.

## Fallstricke
- `watch/target.ts` ist ein Nachbau von `lib/insights.ts` `computeTarget` und `lib/baseline.ts`. Ändert die Oberfläche dort etwas, muss die Uhr nachziehen (Bitte in „Für die andere Rolle“).
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
- PR #73 gemergt: heutiger Tag am Morgen richtig, `diag` raus, Upload grün
- Readiness der Uhr passt zur App (Nutzerin, 23.11.)
- Morgen-Abruf 6:15 Uhr läuft (23.11. bestätigt)
- PR #70 gemergt: Alltag Version 2, Readiness der Uhr wie in der App
- PR #66 gemergt: Ablauf „Daten prüfen“ (nur lesend)
- PR #63 gemergt: Alltagslast Daten, Migration `20261124090000_alltagslast.sql` und Upload von `garmin-sync` grün
