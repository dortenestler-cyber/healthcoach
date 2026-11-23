# Übergabe · Daten (DA)
Zuletzt aktualisiert: 2026-11-23 · Sitzung: https://claude.ai/code/session_014pVPWghKapPifGTJZo8ABF

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Korridore Teil B Daten ist fertig und läuft (PR #63–#73): Alltagslast aus dem Tagespuls, Readiness der Uhr wie in der App, Morgen-Abruf 6:15 Uhr bestätigt. Push eingerichtet (Secrets, Tresor, Testmitteilung angekommen, 23.11.). Keine offenen PRs.

## In Arbeit
- PR #101 (Training-Insights, offen, mergt die Nutzerin wegen Migration): Migration `20261127090000_training_insights` (`garmin_activities.hr_zones` Minuten je Zone 0–5, `hr_series` Puls je 5 Minuten ab Beginn, `rpe` 1–10 nur aus der App). `garmin-sync`/`alltag.ts`: `computeDay` liefert `actDetail` je Aktivität, `actDetailRow`/`mergeActDetail` bauen die Zeilen, gespeichert zusammen mit `hr_points`. Fehlen die Spalten, speichert er nur `hr_points`. Nur Tage, die `syncAlltag` rechnet, bekommen Werte. Nach dem Merge: Läufe prüfen, danach „Daten prüfen“, ob `hr_series` ankommt.
- PR #90 (gemergt 23.11., „Daten prüfen“ 12:36: `awake_count` und `spo2_avg` an 3 von 14 Nächten, also alle aus dem Abrufzeitraum; ältere Nächte nur über „Ein Jahr laden“ im Verlauf): `awake_count`, `spo2_avg`, `spo2_low` aus der Schlafübersicht. `skin_temp_delta`, `sleep_levels`, `sleep_detail_diag` per Migration entfernt, Nacht-Abfrage (`dailySleep`) und Fehlersuche aus `garmin-sync` entfernt, `skin` aus `watch`, Zifferblatt-Feld 31 entfernt (Nummer bleibt frei, gilt als leer), `lib/backup.ts` lässt entfernte Spalten beim Einspielen weg. Nach Merge und Synchronisieren „Daten prüfen“ (Abschnitt „Nachtwerte“).
- PR #93 und #96 (gemergt 23.11.): Glance nach Vorlage (`docs/bilder/vorlagen/18-uhr-glance.png`): Tagesziel bisher in Segmentziffern, Zielbereich, Faktoren mit Abzug, nächste Einheit. `watch` liefert dafür `load` (wie `dayLoad`), `band` [lo, hi] und `factors` [{k, e}]; `targetScore` in `watch/target.ts` gibt dazu Bereich und Faktoren zurück. Monkey C nur über den Lauf `watch-build` geprüft.
- Konzept Zifferblatt Fenix 9 Pro 47 mm (454 px): `docs/entwurf-zifferblatt.html`, veröffentlicht unter https://claude.ai/artifact/QT4fgePZ9sizxoYyygED86. Vorlagen aus dem Klick-Dummy: `docs/bilder/vorlagen/17-uhr-zifferblatt.png`, `18-uhr-glance.png`. In Arbeit: Layouts 15 Monolith, 17 Zyklus-Spur, 19 Stapel, 20 Eine Zeile (Einstellung `layout`, Felder `s_l1`–`s_l3`, Schrift `Big` nur Ziffern, `watch` liefert `cycleLen`). „Immer an“ zeigt bei allen Layouts die Monolith-Uhrzeit mit dünnem Strich (≈ 7 % Pixel). Farbmodus `cmode` (0 Einfarbig, 1 Bedeutung, 2 Nacht) und `nauto` (Nacht zur Schlafenszeit aus `UserProfile`, neue Berechtigung) ersetzen `c_*`; Familien je Wert in `Fields.FAM`/`GFAM`. Pixel: Linien spiegelgleich, Segmente mit gerader Strichstärke, Icons gerundet.
- Ergebnis PR #87 (23.11. 12:12): Einzelne Nacht nur über `/wellness-service/wellness/dailySleep?date=`, liefert dieselben Felder wie die Übersicht. Weder Hauttemperatur (kein Feld mit „temp“, kein `skinTempDataExists`) noch `sleepLevels`. Vorhanden und noch ungenutzt: `awakeCount`, `avgSleepStress`, `averageSpO2Value`/`lowestSpO2Value`, `lowestRespirationValue`/`highestRespirationValue`, `avgHeartRate`, `breathingDisruptionSeverity`, `sleepAlignment.*`, `sleepNeed.*`. Nächster Schritt nach Entscheidung der Nutzerin: Nacht-Abfrage und `sleep_detail_diag` entfernen (bringt nichts Neues, kostet Abrufe), ggf. `awakeCount` speichern.
- Ergebnis PR #84 (23.11. 12:00): `dailySleepData` unter allen vier Pfaden 404 (wie `dailyStress`). Hauttemperatur weiter 0 Nächte, obwohl Garmin Connect sie zeigt. PR #87: Feldnamen der Schlafübersicht (`keyPaths`, nur Namen) in `sleep_detail_diag.uebersicht_felder`, Zeitachse auch aus der Übersicht lesen, zwei weitere Pfade (`dailySleep?date=`).
- PR #84 (gemergt): je Nacht `dailySleepData` (Pfade `SLEEP_PATHS`), Zeitachse in `sleep_levels`, Hauttemperatur aus der Nacht, Fehlersuche in `sleep_detail_diag` (nur Feldnamen). Nach Merge und Synchronisieren „Daten prüfen“ starten: Abschnitte „Einzelne Nächte“ und „Fehlersuche Schlaf-Detail“. Je nach Ergebnis Feldnamen in `findSkinTemp`/`sleepLevels` anpassen, danach `sleep_detail_diag` wieder entfernen (Spalte bleibt leer oder per Migration löschen).
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
- Nutzerin: Upload der Pakete im Garmin-Entwicklerportal (PR #96 gemergt), danach Zifferblatt und Glance auf der Uhr prüfen.

## Für die andere Rolle
- Oberfläche: Entscheidung der Nutzerin (23.11., Logbuch): **Temperatur vollständig aus der App entfernen.** Ab PR #90 gibt es `garmin_daily.skin_temp_delta` nicht mehr (Abfragen mit `select("*")` laufen weiter, der Wert fehlt einfach). Bitte entfernen: Kachel und Hinweise in `components/heute/GlanceTiles.tsx` und `HeuteDetail.tsx` (auch Serie „temperatur“ ab 5 Tagen), `components/verlauf/VerlaufDetail.tsx`, `components/charts/LineBand.tsx`, `components/zyklus/ZyklusView.tsx`, `components/gesundheit/HabitDetail.tsx`, in `lib/` `garmin.ts` (Typ, Kennzahl), `baseline.ts`, `today.ts`, `cycle.ts`, `ovulation.ts`, `zyklusSeite.ts`, `habitStats.ts`, `coachContext.ts`, `useGarminSync.ts` (`skinTempNights`, `skinNote` kommen nicht mehr). Konzepte in `docs/` anpassen (Heute-Einstieg: vierte Kachel statt Hauttemperatur).
- Oberfläche: Neu ab PR #90 in `garmin_daily`: `awake_count` (wie oft wach in der Nacht), `spo2_avg`, `spo2_low` (Sauerstoffsättigung im Schlaf in %). Wunsch der Nutzerin: Wachphasen auf der Schlaf-Seite zeigen (nur Anzahl und Gesamtdauer `sleep_awake_s`, eine Zeitachse liefert Garmin nicht). Kommen an (geprüft 23.11.), kann genutzt werden. Typen in `lib/garmin.ts` fehlen noch.
- Oberfläche: Dein Wunsch „Readiness der Uhr angleichen“ ist mit PR #70 erledigt (gemergt). Die Stresskurve (`stress_curve`) bleibt leer, Garmin liefert sie nicht: Karte „Stress im Tagesverlauf“ entsprechend erklären. `lib/alltagslast.ts`: `v` kann 1 oder 2 sein, `bewegung` neu „stress“ oder „dauer“ (Zone 1 ab 10 Minuten am Stück).
- Oberfläche: PR #63 ist gemergt (Migration grün). Ab dem nächsten Abruf liegt die Alltagslast in `garmin_daily.load_daily_min` (Typ und `readLoadDay` in `lib/alltagslast.ts`). Tageslast = `last_training + last_alltag` (gleiche Einheit wie Garmin-Last, ÷ 150 = %). `quelle: "schritte"` heißt „geschätzt aus Schritten“. Außerdem neu: `hr_curve` (96 Werte), `steps_outside_acts`, `active_s`, `highly_active_s`, `active_kcal`. `faktor = null` heißt: noch Startwert (unter 3 Trainings mit Puls). Für Einstellungen: `LOAD_ZONES`, `puls_ruhe`, `puls_max`, `puls_max_quelle`.
- Oberfläche: `lib/insights.ts` `loadPercent` und `lib/today.ts` `loadByDay` sind deine (Teil B Anzeige), ich ändere sie nicht.

## Fallstricke
- Uhr nur über das Garmin-Entwicklerportal (Regel in `CLAUDE.md`). Store-Bilder mit `node watchface/tools/store_bilder.js` neu erzeugen (zeichnet mit `window.HC` aus `docs/entwurf-zifferblatt.html`), wenn sich Layout oder Glance ändern. Der Lauf „Uhr-App bauen“ packt `upload-zifferblatt` und `upload-uhr-app`. Glance- und Menü-Screenshot sind nachgezeichnet, nicht aus dem Simulator.
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
