# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWdtTj7aEt1xwucQpp1

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
PR #70 gemergt: Alltagslast Version 2 läuft (21 von 57 Tagen neu, Rest folgt), Readiness der Uhr wie in der App. Stressverlauf liefert Garmin nicht (beide Pfade 404).

## In Arbeit
- PR #63 (gemergt): Migration `20261124090000_alltagslast.sql`, `garmin-sync` mit Tagespuls, Zonen, Training/Alltag, Umrechnungsfaktor, Nachberechnung 90 Tage (bis zu 21 Tage je Abruf). Rechenteil in `supabase/functions/garmin-sync/alltag.ts`, Aufbau für die App in `lib/alltagslast.ts`.
  Ergebnis erster Abruf („Daten prüfen“, 22.11. 19:55): 21 von 70 Tagen berechnet, alle aus Puls, Faktor 0,62 aus 6 Trainings, Maximalpuls aus Aktivitäten. Aber `bewegung` überall „keine“ (Schrittverlauf und Stress liefern nichts), `active_s`/`active_kcal` leer, `garmin_activities.steps` leer.
- PR #68 (gemergt): Fehlersuche in `load_daily_min.diag` (nur Feldnamen und Fehlermeldungen). Ergebnis 22.11. 20:00: `dailySummaryChart?date=` und `dailyStress/{Tag}` → 404. Tageszusammenfassung hat `calories.burnedActive`, aber keine aktive Zeit (`active_s`, `highly_active_s` bleiben leer). Aktivitäten im Abrufzeitraum hatten keine Liste, Feldname für Schritte je Aktivität noch offen (vielleicht nur Klettern/Kraft ohne Schritte).
- PR #69 (gemergt): aktive kcal aus `calories.burnedActive` (kommt an). `/userprofile-service/socialProfile` → 404, also kein Profilname, kein Schrittverlauf. Bewegung im Alltag nur über den Puls erkennbar.
- PR #70: Rechenweise Version 2 (`LOAD_VERSION` in `alltag.ts`): ohne Stressverlauf zählt Zone 1 ab 10 Minuten am Stück (`bewegung: "dauer"`), mit Stressverlauf nur Minuten mit Stresswert −2 (`"stress"`). Ältere Tage (v1) rechnet jeder Abruf nach (bis 21). Stress über `STRESS_PATHS` (zuerst `?date=`), gemeinsamer Zwischenspeicher für Stresskurve und Alltag. Schrittverlauf, Profil und Feldnamen-Suche entfernt; `diag` enthält nur noch `puls_pfad`, `stress_pfad`, `stress`.
  Uhr: `watch/target.ts` rechnet Bereiche wie `lib/baseline.ts` (30 Tage ab 7/stabil 14, je Phase 150 Tage ab 10, kranke Tage + 3 raus, Schlaf zyklusabhängig). Krankheiten werden dafür 180 Tage geladen.
  Ergebnis 22.11. 20:15: `version_2` 21, `dailyStress?date=` und `dailyStress/{Tag}` beide 404, `stress_pfad` null. Bewegung im Alltag also immer nach der 10-Minuten-Regel.
  Nächster Schritt (beim nächsten PR an `garmin-sync`, kein Eilfall): `diag` entfernen, Stressabruf für den Alltag streichen (spart einen Abruf je Lauf). Auffällig: `bb_curve` nur an 3 Tagen, also kommt „Energie über den Tag“ nur teilweise. Prüfen, ob der Body-Battery-Pfad nur für kurze Zeiträume antwortet.
- Stresskurve (`AUFGABEN.md` Abschnitt 11): Garmin Personal API liefert keinen Stressverlauf (`dailyStress/{Tag}` und `dailyStress?date=` 404). Nur die Tageswerte (Durchschnitt, Aufteilung) kommen.

## Wartet auf
- Nutzerin: Rückmeldung, ob die Readiness auf der Uhr zur App passt (`AUFGABEN.md` Abschnitt 14)
- Nutzerin: Secrets für Push und Eintrag `push_cron_secret` im Tresor (`AUFGABEN.md` Abschnitt 3 und 4)
- Nutzerin: Rückmeldung, ob der Morgen-Abruf um 6:15 Uhr geklappt hat (`AUFGABEN.md` Abschnitt 9). Wenn nicht: Tabelle `garmin_sync_runs` und Zeitplan in `pg_cron` prüfen
- Nutzerin: Rückmeldung, ob Atemfrequenz und Stress im Tagesverlauf ankommen (`AUFGABEN.md` Abschnitt 11)

## Für die andere Rolle
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
- PR #66 gemergt: Ablauf „Daten prüfen“ (nur lesend)
- PR #63 gemergt: Alltagslast Daten, Migration `20261124090000_alltagslast.sql` und Upload von `garmin-sync` grün
