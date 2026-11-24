# Übergabe · Oberfläche (OF)
Belegt: frei
Zuletzt aktualisiert: 2026-11-24 · Sitzung: https://claude.ai/code/session_014pVPWeGvqeNgRwY9UX6dwJ









## Bündeln Baustein Kalender mit Ebenen (PR #136, 24.11.)
- `components/kalender/Monatskalender.tsx`: Monat mit Phasenbändern (Vorlage 02), Ebenen Zyklus · Training · Symptome als Tasten, Punkte je Sportart (voll erledigt, hohl geplant), Symptome Amber, gewählter Tag hell, Tipp → `onPick`. Props `ebenen`, `start`, `punkte`, `onMonth`, `head`, `footer`.
- Training: alles an, Kalender links, Tagesblatt rechts. Zyklus (`CycleCalendar` ist jetzt ein dünner Rahmen): Zyklus und Symptome an, Training zuschaltbar (aus `data.acts` und `data.done`), Tipp öffnet Tagesblatt im Blatt.
- Entfernt: altes Raster und Filter Alles/Training/Zyklus im Trainingskalender, tote Stile (`cal-dots`, `ph-*-bg`, `data-phase`, `segmented-3`, `legend-period`). Garmin-Perioden kommen über `data.diary` (schon zusammengeführt), `loadPeriodDays` dort nicht mehr nötig.

## Bündeln Baustein Tagesblatt (PR #135, 24.11.)
- `components/tag/Tagesblatt.tsx`: Kopf mit Zyklustag (Vorlage 02), Auf einen Blick (Readiness, Schlaf, Belastung, HRV, Ruhepuls, Stress; Kacheln `--card-2`, Vorlage 09), Training (`TagTraining.tsx`, aus `CalendarSection` herausgelöst: planen, erfassen, Garmin), Tagebuch (Zusammenfassung, „Im Tagebuch bearbeiten ›“ → `/tagebuch?tag=`), Besonderes (Krank, Verletzt, Wadenkrampf, Hitzewallungen). Prop `bare` ohne Karte und Datum.
- Trainingskalender: Tagesblatt statt Tageskarte, `TwoCol` (ab 1360 px bzw. 1024 px ohne Coach-Spalte nebeneinander). Zyklus-Kalender: Tage sind Knöpfe, öffnen das Tagesblatt im `EditSheet` (`instant`, „Fertig“).
- Bewusst noch nicht: Heute ‹ › bleibt bei Heute; Punkte in Diagrammen öffnen das Tagesblatt noch nicht (kommt mit der Wert-Seite).

## Bündeln Baustein Eintragen-Blatt (PR #134, 24.11.)
- `components/ui/EditSheet`: neue Props `instant` (nur „Fertig“, jede Änderung speichert sofort), `saveLabel`, `error`; `onSave` optional.
- Medikamente: `MedSheet` ersetzt `AddMed` und `EditMed` (Anlegen und Ändern, Löschen nur bei früheren Mitteln). Körper: Liste „Ändern“ öffnet Blatt mit Stepper und Löschen (vorher Sprung nach oben und Browser-Rückfrage). Wadenkrampf: Ändern im Blatt mit `instant`, Löschen mit Rückfrage im Blatt.
- Bewusst nicht: Krank & verletzt (geführter Ablauf, Ändern schon im Blatt), Körper-Stepper zum Eintragen, Tipp-Felder im Tagebuch, Periode nachtragen (Tagebuch mit Datum), Kettlebell-Plan, Bouldern, Karate (Listen-Zeilen).
- Testumgebung für Fotos mit Beispieldaten: Playwright fängt Supabase-Aufrufe ab (Skripte nicht im Repo; Aufbau: Sitzung in localStorage `sb-localhost-auth-token`, `page.route` auf `http://localhost:3999/**`, Dev-Server mit `NEXT_PUBLIC_SUPABASE_URL=http://localhost:3999`).
- Nächster Baustein: 3 Tagesblatt.

## Bündeln Baustein Einordnung und Zeitraum (PR #133, 24.11.)
- `lib/einordnung.ts` (`bereichWort`, `bereichSeit`, `zielWort`, `lageIn`, `gross`): genutzt von `positionText`, Korridor, FactorList, GlanceTiles, DayBars, LineBand, RingRow, LoadCard. Einheitlich „über/unter deinem Bereich“, „unter/im/über dem Ziel“.
- `lib/zeitraum.ts` + `components/ui/SpanSwitch.tsx`: Heute · 7 T · 30 T · 3 M · 6 M · 1 J. Verlauf nutzt alle (Heute zuschaltbar, Standard 30 T), Belastung über die Zeit ohne 1 J (180 Tage Daten). `lib/verlauf.ts` `Span` = `Zeitraum`.
- Bewusst noch nicht: Zustände (Cardio/Muskeln) und Readiness-Stufen bleiben in `lib/belastungZeit.ts` und `lib/cycle.ts`; feste Fenster (Tagebuch 4 Wochen, Ziel und Ist 14 Tage) kommen mit Wert-Seite und Raster.
- Nächster Baustein: 2 Eintragen-Blatt.

## Wochenvorlage raus, Training im Kalender (PR #130, 24.11.)
- `CalendarSection`: Karte Wochenvorlage entfernt, „+ Sport“ an jedem Tag: kommende Tage planen, heute und früher erfassen im `EditSheet` (Dauer 30/45/60/90 oder eingetippt, Anstrengung 1–10, beides freiwillig). „Erledigt“ und „Bearbeiten“ öffnen dasselbe Blatt. `HabitCard`: Wochenziel mit − und + (`settings.trainingDaysGoal`, Start 4), zählt erfasste Einheiten. `Data.done` (erledigte `planned_sessions`) fließt in Trainingstage, Muskelbelastung und Coach.
- Konzept Bündeln: `docs/konzept-buendeln.md`, Prompt `docs/prompt-buendeln.md`, Entwurf, wartet auf Freigabe (4 offene Fragen).
- Gemergt 24.11., Migration grün. Nächster Schritt: Rückmeldung der Nutzerin zum Erfassen; Antworten auf die 4 Fragen im Konzept Bündeln.

## Belastung über die Zeit (PR #129, 24.11.)
- Konzept `docs/konzept-belastung-ueber-zeit.md`. `BelastungZeitCard` ersetzt `LoadTrendCard` (gelöscht). Rechnung `lib/belastungZeit.ts` (`series`, `cardioPerDay`, `tiredCheck`, `musclePerDay`, `verteilung`). Die Karte lädt `kb_sets` und `rpe` selbst (180 Tage). Coach bekommt beide Zustände.
- Geprüft mit Beispieldaten auf einer Testseite (gelöscht). Nächster Schritt: Rückmeldung der Nutzerin, vor allem zu den Startwerten der Muskelpunkte (÷ 40, Karate halb, Anstrengung 5).

## Säulen-Diagramme: Achse rechts (24.11.)
- `DayBars`: Achsenbeschriftung in einem Rand rechts (Breite aus der längsten Beschriftung), stand vorher links über der ersten Säule (Intensität, Diese Woche).

## Belastung wie bei Bevel (PR #127, 24.11.)
- Konzept `docs/konzept-belastung-skala.md`. Abflachende Skala (`loadToPct` in `lib/alltagslast.ts`), persönliches Ziel (`usualLoad`, `targetBand` in `lib/insights.ts`), `loadLabel` („unter 1 %“), `ringSplit` (Ring über 100 % voll, Anteile bleiben). `HARD_DAY_PCT`/`MID_DAY_PCT` zentral in `lib/insights.ts`. Wert je Einheit in % (Heute, Einheit-Seite mit Garmin-Last als Notiz). Satz „Bisher ist heute keine Belastung gemessen.“ statt „nur aus dem Training“ bei 0.
- Nächster Schritt: Rückmeldung der Nutzerin nach ein paar Abrufen (Vergleich mit Bevel).

## Keine Hinweise zu fehlenden Garmin-Daten (PR #123, 24.11.)
- Wunsch der Nutzerin: Zeilen wie „Stress im Tagesverlauf ist bei Garmin nicht abrufbar.“ nicht mehr zeigen. `useGarminSync` liefert kein `note` mehr, `HeuteView` zeigt nur noch echte Fehler. Die Funktion `garmin-sync` schickt die Hinweise weiter mit, sie werden ignoriert.
- PR #125: auch auf anderen Seiten raus: Wachphasen (`HeuteDetail`, nur der Satz „keine Diagnose“ bleibt), Stress-Detail (nur der Link zum Verlauf bleibt), Einheit-Seite („Garmin hat … keine Belastung geliefert“). `SyncResult` ohne Hinweisfelder. Echte Fehlermeldungen (z. B. fehlende Datenbank-Spalte beim Speichern) bleiben.

## Erklärkarte je Ring, Ringe Zyklus und Intensität (PR #119, 24.11.)
- `RingRow` meldet nach dem Wischen den Ring in der Mitte (`onCenter`), `HeuteView` gibt ihn als `focus` an `DaySentence`. Texte je Ring in `components/heute/DaySentence.tsx` (Zubettgehzeit aus dem Median von `sleep_end_min` der letzten 14 Nächte minus Bedarf heute Nacht).
- Neue Ringe: Zyklus (öffnet `/zyklus`, Terracotta, bei Menstruation `menses`) und Intensität (`weekIntensity` gegen 150 min, Detailseite `/heute/intensitaet`). Reihenfolge: Zyklus, Energie, Schlaf, Readiness, Belastung, Intensität, Stress.
- Rondell oder alle nebeneinander hängt jetzt an der Breite (`staticMin`, Klasse `.is-static`), nicht mehr an 768 px: am Computer mit Coach-Spalte (1024) ist es das Rondell, bei 1440 stehen alle sieben nebeneinander.

## Dein Tag als Rondell (PR #112, 24.11.)
- `components/heute/RingRow.tsx`: fünf Kopien der Reihe (`COPIES`, echt nur `MID`, Kopien `aria-hidden`/`tabIndex -1`), nach dem Wischen (Scroll-Pause bzw. `scrollend`) Sprung zurück in die mittlere Kopie. Größe per CSS-Variable `--k` (JS, nur bis 767 px), Ringe immer 120 px, verkleinert mit `transform`.
- Tipp auf äußeren Ring dreht ihn in die Mitte (`onTap`), Tastatur-Fokus ebenfalls. Ab 768 px Kopien ausgeblendet, Größe fest (`--s` 0,77 / Readiness 1).
- Nächster Schritt: Rückmeldung der Nutzerin auf dem iPhone (Gefühl beim Wischen, Abstand der Ringe `flex: 0 0 112px`).

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Training-Insights (PR #101, 23.11.)
- Einheit-Seite `app/training/einheit/[id]` → `components/training/UnitDetail.tsx`, Reiter „Insights“ in `TrainingView` → `components/training/InsightsSection.tsx`, Rechnung in `lib/trainingInsights.ts`. Aktivitäten in `CalendarSection`, `TodayPlan` und `RecentActivities` verlinken auf die Einheit. Training-Muster mit Ergebnis zusätzlich in `OverviewSection` („Weitere Muster“), letzte Einheit im Coach-Kontext.
- Beide Seiten laden `garmin_activities` mit `select("*")`, damit sie ohne die neuen Spalten weiterlaufen. `loadInsightData` bleibt unverändert.
- PR #103: Zeitstrahl mit zwei Achsen (Puls links, Belastung rechts) und Legende. PR #104: `SportPicker` auf der Einheit-Seite schreibt `sport_override`/`sport_label`; „Sonstiges“ ohne Namen wird nicht verglichen.
- Muster „Ruhetage zwischen harten Tagen“ (`restDaysPattern`, PR #110) umgesetzt, Konzept damit vollständig.

## Sport und Stress aus Garmin im Tagebuch (PR #108)
- `TagebuchView`: Kachel zeigt „· aus Garmin“ (`auto_set`), Abwählen schreibt beim Speichern `auto_off`, Speichern setzt `manual = true`.
- Einträge mit `manual = false` gelten als `garminOnly` (`markAutoRows` in `lib/insights.ts`, angewandt in `insightData`, `ZyklusPage`, `VerlaufView`) und zählen in „mit und ohne“ nicht als „ohne“ (`splitDays`, `insights.ts`, `zyklusSeite.ts`). Diese Loader lesen das Tagebuch jetzt mit `select("*")`.

## Stand in einem Satz
Sammelliste Runde 2 (Punkte 14–21) umgesetzt in PR #83, inklusive Teil A der Datenaktualisierung.

## In Arbeit
- PR #97 (Zweig `claude/bold-thompson-n6ty19`, `[OF]`): Hauttemperatur komplett aus App, lib und Konzepten entfernt (Typ `temperatur`, Infekt-Erkennung nur noch Ruhepuls+HRV, Gewohnheiten, Verlauf, Zyklus, Coach-Kontext). Schlaf-Seite: neue Karte „Wach und Sauerstoff in der Nacht“ (`awake_count`, `sleep_awake_s`, `spo2_avg`, `spo2_low`, Typen in `lib/garmin.ts`). Stress-Hinweis „Garmin liefert den Verlauf nicht“ stand schon da. Nächster Schritt: Rückmeldung der Nutzerin, dann mergen (keine Migration, keine Funktion).
- Keine offene Arbeit. PR #83 (Zweig `claude/tender-archimedes-h1rwvr`): Sammelliste Runde 2.
  Neu: `components/charts/useChartWidth.ts` (Charts zeichnen in echter Breite, `grownHeight`), `monotoneCurve`/`smoothBand` in `scale.ts`, `usePick(..., w, shared)` für gemeinsamen Tag, `components/verlauf/VerlaufGroup.tsx` (Gruppen, `?m=` öffnet weiter die Detailansicht), `components/ui/DayPick.tsx`, `components/ui/EditSheet.tsx` (natives `<dialog>`), `lib/anzeichen.ts` und `SIGNS`/`ALL_SYMPTOMS` in `lib/catalog.ts`, `components/heute/SignHintCard.tsx`, `lib/refresh.ts` (`useRefresh`, `useToday`, `announceNewData`), `app/version/route.ts` und `NEXT_PUBLIC_BUILD_ID` in `next.config.ts`.
  `useGarminSync(data, enabled)` ruft kein `onSynced` mehr auf, sondern `announceNewData()`; Seiten laden über `useRefresh` neu.
  Nächster Schritt: Rückmeldung der Nutzerin. Offen: Tagebuch lädt bewusst nicht automatisch neu (ungespeicherte Änderungen).
- Keine offene Arbeit. PR #77 (Zweig `claude/kind-keller-hmdy0s`): Sammelliste `docs/sammelliste-oberflaeche.md` komplett, Web-App nach `docs/konzept-web-app.md`.
  Neu: `components/SideNav.tsx`, `components/CoachPanel.tsx`, `components/ui/TwoCol.tsx`, `lib/layout.ts` (Breiten, Coach-Spalte), `components/charts/pick.tsx` (Antippen in Charts), `components/heute/ActivityQuestion.tsx`, `lib/ovulation.ts`. Eisprung ist jetzt eigene `PhaseGroup`. `sportOf(a)` statt `sportOfGarmin(a.type_key)` (eigene Zuordnung zuerst). PIN nur iPhone (`pinRequired`).
  Nächster Schritt: Rückmeldung der Nutzerin; danach evtl. zwei Spalten für Training › Kalender und Gesundheit › Überblick/Medikamente.
- Detailseiten nach Whoop sind mit PR #78 gemergt (`FactorList`, `ReadinessCard`/`HrvCard`/`StressCard` entfernt). Stift zum Wählen von Ringen und Kacheln: noch nicht freigegeben, nur vorgeschlagen.

## Wartet auf
- Nutzerin: Rückmeldung zu PR #83 (`AUFGABEN.md` Abschnitt „Sammelliste Runde 2“)
- Daten: Teil B der Datenaktualisierung (siehe unten)
- Daten: Spalten `garmin_activities.sport_override/sport_label` und `diary_entries.ovulation_signs` (siehe unten). Bis dahin blendet die Oberfläche beides aus.
- Nutzerin: Rückmeldung zu PR #77 (`AUFGABEN.md` Abschnitt „Sammelliste Anpassungen“)
- Nutzerin: Rückmeldung zur neuen Seite Heute (`AUFGABEN.md` Abschnitt „Heute als Einstiegsseite“)
- Nutzerin: Rückmeldung zu Heute, Zyklus und Training im Design „dunkel 2“ (`AUFGABEN.md` Abschnitt 10)
- Nutzerin: Rückmeldung zur Seite Zyklus (`AUFGABEN.md` Abschnitt 6)

## Für die andere Rolle
- Daten: Temperatur-Bitte ist mit PR #97 erledigt. Die Uhr-Funktion `watch` und `garmin-sync` habe ich nicht angefasst.
- Daten: **Freigegeben am 23.11.** Konzept `docs/konzept-datenaktualisierung.md` Teil B: Abruf alle 2 Stunden von 8 bis 22 Uhr (Europe/Berlin, 1 Tag), alle Abrufe in `garmin_sync_runs` protokollieren (auch die aus der App), läuft schon einer, keinen zweiten starten, bei „zu vielen Anfragen“ 2 Stunden Pause. Die App prüft derzeit nur das Alter von `garmin_daily.synced_at` und merkt sich ihren letzten Versuch je Gerät; sobald B3 steht, kann sie die Sperre und laufende Abrufe aus `garmin_sync_runs` lesen.
- Daten: Der Coach-Text in `supabase/functions/coach` nennt die 7-Tage-Summe evtl. noch „Last“; die App sagt jetzt „Belastung“. Die App schickt jetzt auch Anzeichen (z. B. `hals_rau`, `nase_zu`) als Symptome mit.
- Daten: **Freigegeben am 23.11.** Zwei Migrationen für die Sammelliste (`docs/sammelliste-oberflaeche.md`). Die Oberfläche liest und schreibt diese Namen, bitte so anlegen:
  - `garmin_activities.sport_override text null` (Werte `karate|kettlebell|klettern|ausdauer|sonstiges|ignorieren`) und `garmin_activities.sport_label text null` (eigener Name bei „Anderes“). `garmin-sync` darf beide beim Upsert nicht überschreiben. Update-Recht für die eigene Zeile per RLS.
  - `diary_entries.ovulation_signs text[] not null default '{}'` (Werte `test|mittelschmerz|schleim|temperatur`).
  Bis die Spalten da sind, blendet die Oberfläche die Funktionen aus (Fehler werden abgefangen).
- Daten: Laut Nutzerin kommt die Hauttemperatur nicht in der App an (`skin_temp_delta` leer). Bitte in `garmin-sync` prüfen. Die Readiness-Seite zeigt solange „Hauttemperatur kommt noch nicht von Garmin an“.
- Daten: Teil B des Konzepts `docs/konzept-korridore-alltagslast.md` (Migration und `garmin-sync` für die Alltagslast). Freigegeben am 22.11.
- Daten: Die Readiness der Uhr (`supabase/functions/watch/target.ts`) nutzt noch nur den Luteal-Bereich. Die App misst jetzt je Zyklusphase, Schlaf zählt auch als zyklusabhängig, und Krankheitstage zählen nicht. Bitte angleichen, damit Uhr und App dasselbe zeigen.

## Fallstricke
- Bildschirmfotos mit Beispieldaten am Computer: Bau mit `NEXT_PUBLIC_SUPABASE_URL=https://beispiel.supabase.co`, Sitzung als `sb-beispiel-auth-token` in localStorage, REST-Anfragen abfangen (Filter `eq/gte/lte/not.is.null`). Breiten 390, 1024, 1440 prüfen.
- Abstände zwischen Abschnitten kommen aus `.app-content > * + *` (früher `.shell > * + *`). Inhalte in `TwoCol` haben eigene Abstände.
- Bildschirmfotos mit Beispieldaten: Skript-Muster siehe PR #76 (Supabase-Anfragen abfangen, Sitzung und PIN in localStorage/sessionStorage setzen, Filter `eq/gte/lt` nachbauen).
- Bildschirmfotos ohne echte Daten: mit `NEXT_PUBLIC_SUPABASE_URL=https://beispiel.supabase.co` bauen und die Anfragen in Playwright abfangen (Beispieldaten kennzeichnen). Vorher alte `next-server`-Prozesse beenden, sonst liefert ein alter Server veraltete Dateien.
- Vor jedem Umbau eines Bildschirms den Prompt in `docs/prompt-designkonzept.md` befolgen.
- Keine festen Farbwerte in Komponenten, nur Variablen aus `app/globals.css`.

## Erledigt seit letzter Übergabe
- Symptome von gestern (24.11.): `symptomBasis` in `lib/insights.ts` (heute voll, sonst gestern halb, nach Antwort im Check-in nur heute), genutzt in Readiness-Faktor, `throttleFor` (`lib/cycle.ts`) und `signHint` (`lib/anzeichen.ts`). Frage im Check-in: `components/tagebuch/YesterdaySymptoms.tsx` in `CheckinCard`, lädt das Tagebuch danach neu. Migration `20261128090000_symptome_bestaetigt` (Rolle Daten, mit Freigabe).
- PR #115 (24.11.): Coach-Knopf blendet beim Scrollen nach unten aus (`useHideOnScrollDown` in `CoachButton.tsx`, `.coach-fab[data-hidden]`), weil er „Ändern“ der Wochenvorlage verdeckte.
- PR #92: Schmerzwerte einer Verletzung im Bearbeiten-Bogen ändern, entfernen, nachtragen (`editPains`, gespeichert mit „Speichern“). Wadenzucken im Tagebuch: Tag (`DayPick`) und Uhrzeit änderbar; Uhrzeit vor 4 Uhr liegt am Kalendertag danach, zählt zum gewählten Abend.
- PR #86 gemergt, Migration grün, von der Nutzerin in der App getestet (23. Nov.): Coach-Chats. Tabelle `coach_chats`, `coach_messages.chat_id` (on delete cascade). Funktion `coach` nimmt `chat_id`, legt neuen Chat erst nach der Antwort an, Verlauf nur aus dem Chat, gibt `chat_id` zurück; ohne Tabelle alter Verlauf. `CoachView`: Leiste Verlauf/Neuer Chat, Liste nach Heute/Gestern/Diese Woche/Älter, Löschen mit Rückfrage, nach 6 Stunden neuer Chat. Backup enthält `coach_chats` vor `coach_messages`.
- PR #85 gemergt: Coach-Antworten nicht mehr abgeschnitten, Werte von heute, kleiner Senden-Knopf.
- (PR #85) Coach-Fehler behoben (Zweig `claude/blissful-darwin-ww6tm7`): Antworten brachen ab, weil das Nachdenken des Modells zu `max_tokens` 900 zählte (jetzt 6000, effort low, abgeschnittene Antworten werden nicht gespeichert). Zusammenfassung enthält jetzt die Werte von heute und wird vor jeder Frage erneuert, wenn sie älter als 2 Minuten ist. Antworten mit fett und Listen, Senden als runder Pfeil-Knopf. Ändert auch `supabase/functions/coach` (DA-Bereich), daher Merge erst nach Freigabe.
- PR #72 gemergt: Farbsystem „Nacht“ (immer dunkel, schmale Ringe, Energie Sage hell) und Konzept Heute als Einstiegsseite (nur Doku)
- PR #65 gemergt: Korridore Schritt 3, Alltagslast in der Anzeige
- Aufräumen abgeschlossen (`docs/aufraeumen-vorschlag.md`): PR #62 Tagebuch und Zyklus (Hitzewallungen neben Symptomen, Verlauf 4 Wochen eingeklappt, Perioden nachtragen auf Zyklus).
- Aufräumen 1–3 gemergt: PR #56 Heute (5 Karten, Check-in ins Tagebuch), #57 Training (Reiter Auswertung, `/tagesziel` leitet weiter), #59 Einstellungen (nur Einrichtung)
- PR #60 gemergt: Korridore Schritt 1
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
