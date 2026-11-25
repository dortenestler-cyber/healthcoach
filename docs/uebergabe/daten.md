# Übergabe · Daten (DA)
Belegt: frei
Zuletzt aktualisiert: 2026-11-25 · Sitzung: https://claude.ai/code/session_017zWr1WTBNyc3ZjZhsy1RJj

## Vercel Hobby (PR #183, 25.11., Freigabe der Nutzerin)
- Pro-Tarif gekündigt, jetzt Hobby: 100 Deployments am Tag inkl. Vorschauen, Vercel-Cron nur einmal täglich (±59 Min).
- `vercel.json`: `ignoreCommand` ersetzt durch `git.deploymentEnabled` (`**` aus, `main` und `vorschau/**` an). Der alte Ignored Build Step legte für jeden Push auf einen Arbeitszweig trotzdem ein abgebrochenes Deployment an.
- Geprüft: Alle Zeitpläne (`garmin-morgen`, `garmin-tagsueber`, `health-coach-push`) laufen über pg_cron in Supabase, keine Vercel-Crons. Vom Tarifwechsel nicht betroffen.
- Regel in `CLAUDE.md` › Arbeitsweise ergänzt. Wartet auf: nichts.

## Tagesabschluss am Abend (PR #180, 25.11., Freigabe der Nutzerin)
- Migration `20261130110000_tagesabschluss`: `push_subscriptions.evening_push` (an), `evening_at` ('21:00'), `evening_sent_on`. `garmin_day_tick` macht um 19:37, 20:37, 21:37 einen vollen Abruf `{days: 1}` (Belastung aus dem Alltag), sonst den kurzen.
- `push`: `due` geht jetzt über alle Geräte; Tagesabschluss ab `evening_at` bis 23:30, einmal am Tag. `tagesabschluss`/`sleepPlan` in `push/nachrichten.ts` (Schlafbedarf wie `sleepNeed` in `lib/today.ts`, vereinfacht; ins Bett bis = übliche Aufwachzeit 14 Nächte minus Bedarf). Link `/tagebuch?abschluss=1`.
- Geprüft: `deno check`, Text an Beispieldaten.
- PR #180 gemergt 25.11., Migration und Hochladen grün. Wartet auf: erster Tagesabschluss am Abend.

## Tagesstart und Mitteilung nach dem Training (PR #179, 25.11., Freigabe der Nutzerin)
- Migration `20261130100000_tagesstart_training`: `push_subscriptions.training_push`, `show_values` (beide Standard an), `garmin_activities.notified_at` (alle bisherigen gesetzt), Funktion `garmin_day_tick` und Zeitplan `garmin-tagsueber` (Minute 7, 22, 37, 52; nur 6–22 Uhr Berlin) ruft `garmin-sync` mit `{quick: true}`.
- `garmin-sync`: `quick` holt nur die Aktivitäten von gestern und heute (eine Anfrage), dazu `syncDetails`, kein Eintrag in `garmin_sync_runs`. Nach Zeitplan-Läufen `notifyTraining()` → `push` `{action: "training"}` mit `PUSH_CRON_SECRET`. Abruf aus der App setzt `notified_at` neuer Einheiten (keine Mitteilung). `actRow`, `saveActivities` ausgelagert.
- `push`: `due` schickt den Tagesstart ab `remind_at` (wartet bis 2 Std auf Garmin-Werte der Nacht), auch wenn der Check-in schon da ist. `training` meldet Einheiten ohne `notified_at`, die vor höchstens 6 Std endeten. Texte in `push/nachrichten.ts`, `show_values = false` → neutraler Satz.
- `watch/today.ts`: Tagesrechnung aus `watch/index.ts` ausgelagert, nutzen Uhr und Tagesstart. `_shared/abschnitte.ts`: Erkennung für App und `push`; Lauf „Supabase-Funktionen hochladen“ überspringt Ordner mit `_`.
- Geprüft: `deno check` für garmin-sync, watch, push; Texte an Beispieldaten. Ungeprüft: Hochladen mit `_shared` und `../watch` (erster Lauf nach dem Merge zeigt es).
- PR #179 gemergt 25.11., Migration und Hochladen grün (auch mit `_shared`). Wartet auf: Tagesstart am Morgen und erste Trainingsmitteilung.

## Abschnitte aus dem Puls (PR #176, 25.11., Freigabe der Nutzerin)
- Migration `20261130090000_abschnitte`: `garmin_activities.hr_fine` (Puls je 5 s ab Beginn, `[]` = Garmin liefert keinen), `garmin_sets` (aktive Sätze aus `/exerciseSets`: `{s, d, r}`), `segment_count` (0–200, nur App).
- `garmin-sync/details.ts`: `/activity-service/activity/{id}/details` (zwei Pfadvarianten), `fineSeries`, `activeSets`; `syncDetails` in `index.ts` holt je Abruf höchstens 8 Einheiten ohne `hr_fine`, neueste zuerst. Scheitert der Pfad, Hinweis `detailNote`, nichts wird gespeichert. Sätze nur bei Krafttraining/HIIT oder Zuordnung Kettlebell. Rückgabe `detailUnits`, `detailNote`.
- Geprüft: `deno check`, Umrechnung an Beispieldaten. Ungeprüft: ob die Personal API den Detailpfad freigibt.
- PR #176 gemergt 25.11., Lauf „Supabase-Migrationen ausführen“ grün. Lauf „Supabase-Funktionen hochladen“ grün. Nächster Schritt: nach dem nächsten Abruf prüfen, ob `hr_fine` ankommt (`detailNote` leer).

## Garmin-Schlafwert entfernt (25.11.)
- Uhr: `supabase/functions/watch/schlaf.ts` (`sleepTotal`) rechnet den eigenen Schlafwert wie `lib/schlaf.ts` (geprüft: gleiche Werte an Testnächten). Readiness-Faktor SCHLAF mit festen Stufen (≥85 +3, ≥70 0, ≥55 −5, sonst −10), Feld `sleep` für das Zifferblatt liefert den eigenen Wert. `rangeFor` in `target.ts` exportiert und allgemein.
- `garmin-sync` speichert `sleep_score` nicht mehr.
- PR #171 gemergt, Lauf „Supabase-Funktionen hochladen“ grün. PR #172 Migration `20261129100000_ohne_garmin_schlafwert` (`drop column sleep_score`) gemergt.
- Nächster Schritt: an echten Nächten prüfen, ob `awake_count`, `sleep_awake_s`, `sleep_start_min` gefüllt sind.

Zuständig für `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Coach-Texte und Uhrzeiten (25.11., Freigabe der Nutzerin)
- `supabase/functions/coach`: Ziele im SYSTEM-Text ohne festen Kyu und Termin (stehen in der Zusammenfassung), „Gibt die Frage eine Form vor, folgst du ihr“, keine Begriffe und Rechenwege erklären. Neuer Schalter `briefing: true`: kein Verlauf, keine Speicherung in `coach_messages`/`coach_chats`, kein Tageslimit. Nutzt die App für „Für heute“ und „Dein Monat“ (`lib/briefing.ts`). Kosten dieser Anfragen erscheinen deshalb nicht unter Nutzung.
- `supabase/functions/watch`: `plan[].time` immer leer (Uhrzeiten entfallen). Uhr und Zifferblatt kommen mit leerer Zeit zurecht, kein neues Upload-Paket nötig.
- Auslieferung über den Lauf „Supabase-Funktionen“ nach dem Merge.

## Karate-Prüfungen (PR #143, 25.11.)
- Migration `20261129090000_karate_pruefungen`: neue Tabelle `karate_progress` (user_id, item_key, status offen/uebe/sitzt, RLS), `karate_items.kyu` (1–5, Standard 5) und `status` (alte Haken → sitzt), Kategorie „Begriffe“. `done` bleibt und wird mitgeschrieben. Backup enthält `karate_progress`.
- Gemergt 25.11., Lauf „Supabase-Migrationen ausführen“ grün.



## Training erfassen (PR #130, 24.11.)
- Migration `20261128110000_training_erfassen`: `planned_sessions.duration_min` (1–600), `rpe` (1–10), löscht offene Vorlage-Einheiten ab heute. `ensurePlanned`/`applyWeek` sind aus `lib/training.ts` entfernt.
- Gemergt 24.11., Lauf „Supabase-Migrationen ausführen“ grün.

## Belastung wie bei Bevel (PR #127, 24.11.)
- `garmin-sync/alltag.ts`: Stufe „leicht“ ab 20 % Herzfrequenzreserve, halbes Gewicht, nur in Abschnitten ab 10 Minuten. `LOAD_VERSION` 3, Feld `leicht`. Alte Tage rechnet der Abruf nach (21 je Abruf, 90 Tage).
- `watch/target.ts`: `loadToPct`, `dayLoadPct`, `usualLoad`, persönliches Ziel wie in der App. Glance kappt die Anzeige weiter bei 99.
- Nächster Schritt: nach dem Hochladen prüfen, ob `load_daily_min.v` = 3 ankommt (Daten prüfen).

## Stand in einem Satz
Korridore Teil B Daten ist fertig und läuft (PR #63–#73): Alltagslast aus dem Tagespuls, Readiness der Uhr wie in der App, Morgen-Abruf 6:15 Uhr bestätigt. Push eingerichtet (Secrets, Tresor, Testmitteilung angekommen, 23.11.). Keine offenen PRs.

## In Arbeit
- PR #111 und #113 (gemergt 24.11., Upload grün): Morgen-Erinnerung kam nie. „Daten prüfen“ hat jetzt einen Push-Teil (Zeitplan, Läufe, `net._http_response`, Geräte, Check-in-Zeitpunkte). Ursache: Supabase lehnte jeden Zeitplan-Aufruf mit `401 Missing authorization header` ab. `push` wird jetzt mit `--no-verify-jwt` hochgeladen. Wartet auf: Bestätigung, dass die Erinnerung ankommt. Danach (8:00/8:15 Uhr) Abbruch nach 5 s bzw. 503 beim Aufwachen, `last_sent_on` blieb leer: Zeitplan jetzt mit `timeout_milliseconds := 60000` (Migration `20261128100000_push_zeitplan_wartezeit`). Offen, nur auf Wunsch: `last_sent_on` erst nach erfolgreichem Senden setzen.
- PR #108 (gemergt 23.11., Migration und Upload grün): Sport und Stress automatisch im Tagebuch. Migration `20261127110000_gewohnheiten_auto` (`diary_entries.auto_set`, `auto_off`, `manual`). `garmin-sync/habits.ts` (Regeln, `applyAuto`), `syncAutoHabits` in `index.ts` nach der Alltagslast, nur beim Abruf bis heute: 14 Tage, beim ersten Mal (noch kein `auto_set`/`auto_off`) 365 Tage. Neue Einträge mit `manual = false` und `ignoreDuplicates`, damit nichts Eigenes überschrieben wird. Stress für heute erst ab 20 Uhr. Rückgabe `habitDays`, `habitNote`.
- PR #106 (gemergt 23.11., Migration grün): Migration `20261127100000_sportart_eisprung` holt die am 23.11. freigegebenen Spalten nach, die nie angelegt wurden: `garmin_activities.sport_override` (Prüfung auf die sechs Werte), `sport_label` (bis 40 Zeichen), `diary_entries.ovulation_signs` (text[]). Fiel auf, weil die Einheit-Seite beim Zuordnen „Could not find the 'sport_label' column“ meldete.
- PR #101 (Training-Insights, gemergt 23.11., Migration und Upload grün): Migration `20261127090000_training_insights` (`garmin_activities.hr_zones` Minuten je Zone 0–5, `hr_series` Puls je 5 Minuten ab Beginn, `rpe` 1–10 nur aus der App). `garmin-sync`/`alltag.ts`: `computeDay` liefert `actDetail` je Aktivität, `actDetailRow`/`mergeActDetail` bauen die Zeilen, gespeichert zusammen mit `hr_points`. Fehlen die Spalten, speichert er nur `hr_points`. Nur Tage, die `syncAlltag` rechnet, bekommen Werte. Nach dem Merge: Läufe prüfen, danach „Daten prüfen“, ob `hr_series` ankommt.
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
