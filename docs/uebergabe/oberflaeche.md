# Übergabe · Oberfläche (OF)
Belegt: frei
Zuletzt aktualisiert: 2026-11-27 · Sitzung: https://claude.ai/code/session_017zWr1TtsNQFhPjonCriVLT

## Check-in mit 5 Stufen und Check-out am Abend (Wunsch der Nutzerin 27.11., Migration, wartet auf Merge)
- Migration `20261202090000_checkin_fuenf_stufen`: `checkins.energy/sleep/mood` 1–5 (alt 1/2/3 → 1/3/5, läuft nur einmal), neue Spalten `energy_evening`, `mood_evening`.
- `CHECKIN_LEVELS` hat 5 Wörter. Readiness-Faktor „Check-in“ (App `lib/insights.ts`, Uhr `watch/target.ts`): Grenzen 2,4 und 3,8 (vorher 1,7 / 2,4). „Gefühl gegen Messwert“: Energie ≤ 2, 3, ≥ 4.
- Check-out: in `AbschlussCard` (Tagebuch, heute ab 18 Uhr), Energie und Stimmung am Abend, speichert jede Antwort sofort.
- Stimmungs-Auswertung (`lib/stimmung.ts`): Tag = Schnitt aus Morgen und Abend, Gewohnheiten gegen den Morgen danach, Unterschied ab 0,5 Stufen (`MIN_DIFF`).
- Uhr-App bleibt bei 3 Stufen, die Funktion `watch` rechnet 1/2/3 auf 1/3/5 um (kein neues Upload-Paket nötig).
- Geprüft: `tsc`, `npm run build`. Nicht im Browser. Wartet auf: Merge durch die Nutzerin, danach Läufe „Supabase-Migrationen ausführen“ und „Supabase-Funktionen hochladen“ prüfen.

## Stimmung im Zyklus (Variante B, Freigabe der Nutzerin 27.11., ohne Migration)
- `lib/stimmung.ts`: Check-in-Stimmung (1–3) und Stimmungs-Symptome (Stimmungstief, Reizbarkeit, Unruhe, ab mittel) je Phase, 7-Tage-Schnitt, Gewohnheiten gegen die Stimmung am Folgetag je Phase. Mindestens `MIN_DAYS` = 5 Tage je Seite, Unterschied ab 0,3 Stufen.
- `components/zyklus/StimmungKarte.tsx`: Abschnitt „Stimmung“ auf Zyklus (Pille, standardmäßig an): Verlauf mit Phasenleiste, Schnitt je Phase, aufklappbar Gewohnheiten × Phase (Follikel, Luteal).
- `components/gesundheit/HabitDetail.tsx`: Karte „Stimmung je Phase“ je Gewohnheit.
- Geprüft: `tsc`, `npm run build`. Nicht im Browser angesehen, nicht mit echten Daten.
- Nächster Schritt: nach dem Merge mit echten Daten prüfen, ob 3 Stufen reichen (sonst 5 Stufen oder Abend-Eintrag, braucht Migration durch DA).

## Prüfaudit: offene Empfehlungen 8–19 und Uhr (PR #190, 26.11., Freigabe der Nutzerin, Hochladen freigegeben)
- Readiness (`lib/insights.ts`): Startwert 75 (`READINESS_START`), Bonus bei deutlich besseren Werten halbes Gewicht, Schlaf ab 85 +5 (Nr. 17). HRV als Mittel aus letzter Nacht und 7-Tage-Schnitt (`hrvBlend`), Gewicht 15 (Nr. 8). Body Battery halb: −8 / −4 / +2 (Nr. 9). `stressFactor`: Stress der letzten 3 Tage über dem Bereich −3, deutlich darüber −6 (Nr. 10). Zielfaktor-Stützpunkte 30/50/75/92, feste Stufen ab 82/62/42. Beispieldaten: gewöhnlicher Tag im Schnitt 75,4.
- Fünf Stufen (`lib/cycle.ts` `STAGES`, `STAGE_ORDER`): Erholen < 3, Behutsam < 5, Moderat < 6,5, Bereit < 8,5, Volle Kraft. Stufenleiste mit fünf Sage-Tönen (`--recovery-5`).
- Zyklus unsicher (Nr. 18): `CycleToday.uncertain`, wenn die letzten Zyklen um mehr als 7 Tage schwanken und kein Eisprung-Zeichen die Phase stützt. `estWord` zeigt dann „(unsicher)“ statt „(geschätzt)“ (Heute, Tagesblatt, Tagebuch).
- Muskeln in der Tagesbelastung (Nr. 16): `actLoad` in `lib/insights.ts`: Kraft-Einheit mit Anstrengung zählt mindestens Minuten × Anstrengung ÷ 10 × Sportgewicht × 2. Genutzt von `dayLoad` und `loadByDay`. Cardio-Belastung (`cardioPerDay`) bleibt reine Pulslast.
- Muskelpunkte (Nr. 13, `lib/belastungZeit.ts`): `exerciseFactor` (Ganzkörper/Beine 1,2, Oberkörper 1,0, kleine Übungen 0,5) für Kettlebell-Sätze, `climbPoints` nach Boulder-Grad (Versuch halb), das Höhere aus Minuten und Graden zählt. `BelastungZeitCard` und `coachContext` laden `exercise` und `climbs`.
- Cardio-Fokus (Nr. 12): `lib/cardioFokus.ts`, Karte `components/training/CardioFokusCard.tsx` unter Training › Auswertung › Woche. Garmin-Last je Einheit nach Pulszonen verteilt (0–2 locker, 3–4 intensiv, 5 anaerob), 4 Wochen. Mangel unter 30/20/5 %, Schwerpunkt über 60 %.
- Muster (Nr. 14, `lib/muster.ts`): `fisherP` und `bhAdjust`, Fund nur bis korrigiert 0,2, „deutlich“ unter 0,05. Gegen R geprüft.
- Trainingseffekt (Nr. 15): Migration `20261201090000_trainingseffekt` (`te_aerobic`, `te_anaerobic`), `garmin-sync` füllt aus `aerobicTrainingEffect`/`anaerobicTrainingEffect`, ohne Spalten wird ohne gespeichert. Kachel „Trainingseffekt“ auf der Einheit, nur wenn Werte da sind. Ungeprüft: ob die Aktivitätenliste die Felder liefert.
- Intensität (Nr. 19): Unter dem Ring „davon Garmin x min“ (`garminWeekIntensity`).
- Uhr (`supabase/functions/watch/target.ts`, `schlaf.ts`, `today.ts`): gleiche Rechnung wie die App, Stand dieses PRs und #189. Neue Faktoren LAST, STRESS, INFEKT; `score` ist `null` ohne HRV, Ruhepuls und Schlaf. Tagesstart (`push/nachrichten.ts`) zeigt die Readiness jetzt als 0–10 mit Komma wie die App, Texte für die neuen Faktoren. An zehn Beispieltagen rechnen App und Uhr gleich.
- Geprüft: `tsc`, `npm run build`, Funktionsdateien mit `tsc` (kein Deno in der Sitzung). Nicht im Browser und nicht auf der Uhr angesehen.
- Wartet auf: Merge durch die Nutzerin (Migration), danach Läufe „Supabase-Migrationen ausführen“ und „Supabase-Funktionen hochladen“ prüfen. Stufe 3 des Audits (echte Daten) wartet auf den Export.

## Prüfaudit Bewertungslogik umgesetzt (PR #189, 26.11., Freigabe der Nutzerin)
- Anlass: Nacht über 8 Stunden hieß „knapp“. Ursache: Bewertet wurde gegen den Bedarf mit Zuschlägen (Median 30 Nächte + Schlafschuld + Belastung). Eine gewöhnliche Nacht lag damit fast immer unter 100 %.
- `lib/today.ts` `sleepNeed`: Grundbedarf mindestens 7 h (`MIN_NEED_H`), neues Feld `gradeH` = Grundbedarf, höchstens 8 h (`GRADE_MAX_H`), ohne Zuschläge. `sleepAchieved.ratio` misst jetzt an `gradeH`. Die Zuschläge bleiben im Bedarf für die kommende Nacht. `baseRaised` für den Satz auf der Schlafseite. `SleepCard` zählt Nächte unter `gradeH`, `DaySentence` nennt `gradeH` als Bedarf.
- `lib/schlaf.ts` `sleepSentence`: „Genug“ ab 95 %, „Knapp genug“ ab 85 %.
- `lib/insights.ts` `computeTarget` (Empfehlungen 1–7 des Audits):
  1. Faktor „Belastung gestern“ (`recentLoadFactor`): Maßstab ist ein üblicher Trainingstag (oberes Viertel der letzten 28 Tage, mindestens `MID_DAY_PCT`). Gestern ab 1,3× −5, ab 1,6× −10, zwei Trainingstage in Folge −5. Unter 14 Tagen: harter Tag −5.
  2. Zyklusabzug −5 entfällt, wenn die HRV schon am Bereich der Phase gemessen wird.
  3. `infectionSigns`: Ruhepuls ≥ Median der Phase (sonst 30 Tage) + 6 und dazu HRV unter dem Bereich oder Atemfrequenz über dem Bereich. Ersetzt `infectionFor` in `lib/cycle.ts`.
  4. Bei Infektverdacht Faktor −15, Ziel 10–25 %, Stufe „Erholen“ (`readinessFrom`). Bei Pause ebenfalls „Erholen“.
  5. `Target.missing`: ohne HRV, Ruhepuls und Schlaf zeigen Ring, Detailseite, Tagesblatt und Satz „–“ und „Daten fehlen“.
  6. `sleepEffect`: unter 55 Punkten gleitend bis −15 (bei 40).
  7. `readinessFactor` gleitend: 35 → 0,5 · 55 → 0,75 · 80 → 1,0 · 95 → 1,15.
- Geprüft: `tsc`, `npm run build`, zehn Beispieltage mit 120 Tagen Beispieldaten (Skript nicht im Repo). Nicht im Browser angesehen.
- Uhr angeglichen in PR #190.
- Nr. 8–19 umgesetzt in PR #190.

## Intensität: Belastung und Krafttage (PR #185, 25.11., Freigabe der Nutzerin)
- Anlass: Bouldern bringt kaum Intensitätsminuten (Garmin zählt gleich wenig), aber deutlich Belastung.
- `/heute/intensitaet` (`IntensityDetail` in `HeuteDetail.tsx`): neue Karte „Belastung aus Training“ (Satz „Heute 58 aus Bouldern, diese Woche 210.“, Säulen je Tag, nur Training wie Garmin, `loadByDay(data.acts)`), Karte „Kraft · Empfehlung der WHO“ (Tage mit Kettlebell, Bouldern, Karate nach `sportOf`, Ziel `WHO_STRENGTH_DAYS = 2` in `lib/trainingLoad.ts`, Liste der Tage).
- Geprüft: `tsc`, `npm run build`. Nicht im Browser angesehen (Login nötig). Nächster Schritt: Nutzerin schaut auf dem iPhone.

## Tagesabschluss am Abend (PR #180, 25.11., Freigabe der Nutzerin)
- `components/tagebuch/AbschlussCard.tsx`: Satz Belastung gegen Ziel, Kacheln Schlafbedarf und Ins Bett bis, „Ein Wort zum Tag“ in `diary_entries.note` (max. 40 Zeichen, speichert von selbst). Im Tagebuch oben, heute ab 18 Uhr oder mit `?abschluss=1` (scrollt hin).
- Einstellungen › Mitteilungen: Schalter Tagesabschluss mit Uhrzeit 19:30–22:30.
- PR #180 gemergt 25.11.

## Tagesstart und Mitteilung nach dem Training (PR #179, 25.11., Freigabe der Nutzerin)
- `components/settings/PushRows.tsx`: Schalter Mitteilungen (Gerät), Tagesstart (`checkin_reminder`) mit Uhrzeit, Nach dem Training (`training_push`), Werte in Mitteilungen zeigen (`show_values`). `lib/push.ts` lädt `*`.
- `lib/abschnitte.ts` reicht nur noch `supabase/functions/_shared/abschnitte.ts` weiter.
- PR #179 gemergt 25.11.

## Abschnitte aus dem Puls (PR #176, 25.11., Freigabe der Nutzerin)
- `lib/abschnitte.ts`: `detect` (Spitzen nach Prominenz in Anteil der Pulsreserve, Mindestpause je Sportart, Glättung 15 s), `learnScale` (Faktor 0,6–2,0 aus bis zu 20 bestätigten Einheiten derselben Sportart, ab 2), Regeln `SEGMENT_RULES` für Klettern, Kettlebell, Karate, Ausdauer.
- `components/training/AbschnitteCard.tsx` in der Einheit nach der Anstrengung: Kurve mit nummerierten Spitzen, Kacheln, − / + und „Stimmt“ schreibt `segment_count`. Vorschlag in dieser Reihenfolge: bestätigt, Kettlebell-Erfassung (`kb_sets` des Tages), Garmins Satzerkennung, Puls.
- `unitPulse` in `lib/trainingInsights.ts` (Ruhe- und Maximalpuls des Tages), `coachUnitLine` nennt die bestätigte Zahl, sobald `segment_count` in den Aktivitäten geladen wird (`lib/insightData.ts` lädt `segment_count` und `rpe`, PR #177 gemergt 25.11.).
- Test an künstlichen Verläufen: 7 Boulder-Versuche, 12 kurze, 10 Kettlebell-Sätze richtig; 15 Sätze à 30 s / 30 s Pause nur 2 (Pause zu kurz, wird über Bestätigungen gelernt). Nicht im Browser angesehen.
- PR #176 und #177 gemergt 25.11. Wartet auf: Rückmeldung der Nutzerin an echten Einheiten.

## Schlaf nach Menge und Qualität (25.11.)
- Konzept `docs/konzept-schlafqualitaet.md` freigegeben, umgesetzt in `lib/schlaf.ts` (`sleepScore`, `sleepSentence`, `sleepRows`, `spo2Warning`).
- Ring Schlaf (Heute, Detailseite, Tagesblatt) zeigt Gesamtwert 0–100 mit Wort; Detailseite: Kacheln Menge/Erholsam, Satz mit schwächstem Baustein, Faktoren ohne Legende, Karte „Wach und Sauerstoff“ entfernt (Sauerstoff nur noch als Warnzeichen).
- Readiness (`computeTarget`, `readinessFactors`) und Coach-Kontext nutzen den eigenen Wert statt Garmins `sleep_score`. Muster (`lib/muster.ts`, `insights.ts`) und Gewohnheiten (`habitStats.ts`, Zeile „Schlafwert“) nutzen `sleepScores()` statt `sleep_score`.
- `sleep_score` aus `Daily` (lib/garmin.ts) entfernt, App nutzt ihn nirgends mehr. Offen für Daten (Freigabe nötig): Uhr-Readiness `supabase/functions/watch/target.ts` Faktor SCHLAF auf eigenen Schlafwert umstellen, Feld `sleep` in der Uhr-Antwort streichen, `garmin-sync` hört auf zu speichern, danach Migration `drop column sleep_score`.
- Nachkalibriert (Nutzerin: Werte zu hoch): typische Nacht etwa 80 statt 95–100, siehe Konzept 5a.
- Prüfen mit echten Daten: ob `awake_count`, `sleep_awake_s`, `sleep_start_min` zuverlässig gefüllt sind; Gewichte ggf. nachziehen.

## Coach schreibt Tagesempfehlung und Monatsrückblick (25.11.)
- Variante A freigegeben. `lib/briefing.ts` (`useBriefing`): ruft die bestehende Funktion `coach` mit fester Frage und `buildCoachContext()` auf, speichert in `settings.data.briefing.{tag,monat}` mit Schlüssel (Tag; Monat: Tag + Anzahl Veränderungen), ↻ schreibt neu. Rendering `components/ui/CoachText.tsx` (erste Zeile Lage, „- “ Liste, **fett**).
- Heute: `components/heute/Tagesempfehlung.tsx` „Für heute“ statt `DaySentence` (nur heute, nicht bei Warnzeichen; Coach aus oder Fehler → `DaySentence`). Gesundheit: `components/gesundheit/DeinMonatKarte.tsx`, Liste hinter `Details id="monat.liste"`, ohne Veränderungen keine Anfrage.
- Mit `briefing: true` (PR Coach-Funktion): kein Chat-Verlauf, kein Tageslimit.
- Erklärkarten geprüft (9 Stellen): Training-Status (wiederholte „Was das heißt“) und Zyklus-Gewohnheiten (reiner Hinweis) entfernt; die übrigen sieben nennen eigene Zahlen und bleiben.

## Hinweistexte entfernt (25.11.)
- Wunsch der Nutzerin, dauerhaft als Regel in `CLAUDE.md` (Arbeitsweise). `PageHead.sub` ist optional, alle festen Untertitel entfernt (bleiben: Coach „Ausgeschaltet“, Nutzung, neue Hinweise, Konto). Rund 55 Bedienhinweise, Rechenwege, Legenden-Sätze und „keine Diagnose“-Sätze entfernt, ebenso die Karte „So geht die App mit deinen Werten um“ (Körper).
- Geblieben: Leerzustände, Warnzeichen (Fieber, lange erhöhte Werte), Medikamenten-Hinweis ohne geprüfte Quelle, Inhalt hinter „Details“ (Grundlagen, WHO-Quelle), Satz in Einstellungen „keine Diagnosen“.

## Tagebuch passend zur Zyklusphase (25.11.)
- Wunsch der Nutzerin. Phase wie auf Zyklus (`zDiary`: Tagebuch 200 Tage + Garmin-Zyklen + Eisprung-Zeichen, `cycleToday`). Blutung kompakt (`pill-sm`) mit „Zyklustag x · Phase (geschätzt)“ darüber. Eisprung-Zeichen offen im Eisprung-Fenster oder wenn eines eingetragen ist, sonst Pille „+ Eisprung-Zeichen“.
- Symptome: Reihe „Passt zu jetzt“ = eigene Muster (`symptomeUmTag` in `lib/zyklusAuswertung.ts`: in mindestens der Hälfte der letzten bis zu 4 Zyklen am Zyklustag ±1, Zusatz „· oft“), dann typische der Phase (`PHASE_SYMPTOME` in `lib/catalog.ts`), höchstens 6. Darunter „Sonst oft“ wie bisher.

## Uhrzeiten im Plan entfernt (25.11.)
- Wunsch der Nutzerin: keine Uhrzeiten bei geplanten Einheiten. Anzeige in `TodayPlan` und `TagTraining` entfernt, neue Einheiten ohne Zeit (`DEFAULT_TIMES` gelöscht). Spalte `time` bleibt in der Datenbank.
- Uhr: Funktion `watch` schickt keine Uhrzeiten mehr (Freigabe 25.11.).

## Konzept Einfach bedienen (PR #146, Entwurf, 25.11.)
- Dritte Runde nach Aufräumen und Bündeln. Prompt `docs/prompt-einfach.md`, Konzept `docs/konzept-einfach.md`, Skizze `docs/entwurf-einfach.html`, Fotos `docs/bilder/einfach/`.
- Prüfung mit Beispieldaten über einen nachgebauten Supabase-Server (Playwright, 390 × 844). Größte Hürden: kein zentraler Kalender, keine Liste aller Aktivitäten („Alle ›“ auf Heute führt ins Leere), Status-Block über sechs Trainingsreitern, Zyklus 6,7 Bildschirme.
- Vorschlag: `/kalender` mit Ebenen-Pillen und Zeitraum-Auswahl, Training nur noch Übersicht · Auswertung (Sportarten als eigene Seiten, Alle Aktivitäten am Ende), Pillen-Baustein mit drei Arten, gemerkt in `settings.data.ansicht` (keine Migration). Acht Pakete, alle OF.
- Freigegeben 25.11. mit Antworten (Logbuch): Tagebuch speichert sofort, Training Übersicht · Auswertung, Zeitraum im Kalender, Reihenfolge wie Tabelle. Karate als Paket 9 (A + B, Zielkarte C).
- Fehler behoben: Verletzungshinweis nennt den Kyu der nächsten Prüfung (`kyuHinweis` in `lib/health.ts`), geprüft mit Ziel 4. Kyu.
- Paket 1 Pillen (PR #147): `components/ui/Pille.tsx` und `lib/ansicht.ts`. Gemerkt wird sofort im Gerät (localStorage `hc-ansicht`) und gesammelt nach 0,8 s in `settings.data.ansicht` (frisch laden, nur geänderte Schlüssel zusammenführen). Kalender-Ebenen merken sich die Wahl je Ort (`kalender.training`, `kalender.zyklus`). Alle `.pill` haben jetzt eine Tap-Fläche von 44 px (`::after`). Geprüft: Wahl bleibt nach Neuladen und auf einem zweiten Gerät.
- Paket 2 Alle Aktivitäten (PR #148): `components/training/AlleAktivitaeten.tsx`, vorerst unter Training › Kalender (zieht mit Paket 4 ans Ende der Übersicht). Lädt alle Garmin-Einheiten (ohne „ignorieren“) und erledigte `planned_sessions` ohne Garmin-Einheit derselben Sportart am Tag. Filter gemerkt unter `training.aktivitaeten`, Suche über Name und Sportart, 20 je Schritt. Heute „Alle ›“ → `/training?t=kalender#aktivitaeten`.
- Paket 3 zentraler Kalender (PR #149): `app/kalender/page.tsx`, `components/kalender/KalenderView.tsx`, Einstiege in `lib/kalender.ts` (ohne „use client“, weil die Server-Seite sie prüft). `Monatskalender` hat neue Ebenen Gewohnheiten (Strich, Sage), Krank & verletzt (Quadrat, Amber, nur bis heute), Medikamente (Ring, Violett, Bedarfs-Einnahmen), Schlaf (Halbkreis, unter dem 30-Tage-Bereich); Daten über `CalendarSection` (Props `ebenen`, `start`, `merken`, `tag`, `kompakt`). Vorwahl je Einstieg, gemerkt unter `kalender.zentral.<von>`; vorgewählte Pillen stehen vorn. `PageHead` hat `kalender="<von>"` (Tagebuch, Training, Zyklus, Gesundheit), Datum auf Heute ist ein Link. Tagesblatt `kompakt` ohne Kacheln.
- Grenze: Marken nur für die 180 Tage aus `loadInsightData`.
- Training-Tagesblatt ohne Kacheln (PR #151, Wunsch der Nutzerin).
- Paket 4 Training (PR #152): Reiter Übersicht · Auswertung (`?t=kalender` → Übersicht, `?t=insights` → Auswertung, `?t=karate|kettlebell|klettern` leitet auf `/training/karate|kettlebell|bouldern`). Übersicht: `RatioCard` kompakt (Rechenweg, Erklärkarte, Intensitätsminuten, Mit Alltag hinter `Details id="training.status"`), `CalendarSection woche kompakt` (Wochenstreifen + Tagesblatt, „Kalender ›“), Kacheln „Deine Sportarten“ (Trainingstage in 4 Wochen, `lib/sportSeiten.ts`), `AlleAktivitaeten`. Auswertung mit `useAbschnitte("training.auswertung")`: Ziel · Verlauf · Woche · Insights. Sportseiten: `components/training/SportSeite.tsx`.
- Gemessen mit Beispieldaten: Übersicht 4,7 Bildschirme (davon gut 2 Aktivitätenliste), Auswertung 7,1 mit allen Abschnitten an, Karate 2,6.
- Paket 5 Zyklus (PR #153): `components/zyklus/ZyklusWoche.tsx` (Wochenstreifen mit Phasenfarbe, Wort und Satz, „Kalender ›“) statt `CycleCalendar` (gelöscht). `useAbschnitte("zyklus")` in `ZyklusPage`: Werte · Symptome an, Gewohnheiten · Perioden zuerst aus. `CycleHistory teil="perioden"|"symptome"`. Gewohnheiten-Balken hinter `Details id="zyklus.gewohnheiten"`. `#perioden` schaltet den Abschnitt ein und scrollt hin (`einschalten` in `useAbschnitte`). Länge mit Beispieldaten 6,7 → 3,4 Bildschirme.
- Paket 6 Zeitraum (PR #155): `components/kalender/Zeitraum.tsx` (`ZeitraumLeiste`). Im zentralen Kalender (`CalendarSection zeitraum`): langes Drücken 0,45 s (`onLangDruck` in `Monatskalender`) oder „Mehrere Tage wählen“ setzt den Anfang, Tipp setzt das Ende. Aktionen: Periode (nur `bleeding` je Tag bis heute, andere Felder bleiben), Krank (`illnesses` insert, bis heute = offen), Gewohnheit (`influences` ergänzen), Vergleichen (Schnitt gegen 30 Tage davor, ±5 % = „etwa wie sonst“). `PeriodBackfill` bleibt für Ändern/Entfernen, mit Link zum Kalender.
- Paket 7 Tagebuch (PR #156): speichert 0,6 s nach dem letzten Tipp (`dirty` + Timer, `saveRef`), Status „Speichert …“/„✓ Gespeichert“ oben rechts; nach dem Speichern wird nur `history` nachgeführt, nicht neu geladen (sonst gehen schnelle Tipps verloren). Tageswechsel speichert vorher, keine Rückfrage mehr. Datum ist ein Knopf und öffnet `Monatskalender` im `EditSheet` (Verlauf 120 Tage geladen, „oben genutzt“ weiter aus 28 Tagen). Raster „Verlauf, 4 Wochen“ und Hinweise entfernt, Link „Verlauf im Kalender“.
- Paket 8 Details (PR #157): Balken und Grundlage der Musterkarten (Gesundheit „Weitere Muster“ `muster.<key>`, Training Insights `insights.<key>`), Grundlage in `ZusammenhangListe` (`zusammenhang.<mit>`), Gründe und Rechenweg des Tagesziels (`ziel.gruende`, Satz „Stufe heute“ bleibt sichtbar), Empfehlung je Sportart (`ziel.sportarten`) hinter `Details`. Abschnitts-Pillen: Gesundheit › Überblick (Was dir guttut · Dein Monat · Muster), eingebettete Verläufe unter `/wert/schlaf|stress|belastung` (Kurve · Bereich · Phasen · Monat, Kurve und Bereich zuerst an; `VerlaufDetail zeigt`). Längen: Gesundheit 3,8 → 3,4 (ohne Muster 1,9), Auswertung 7,1 → 6,2, Schlaf 4,4 → 3,8.
- Paket 9 Karate (PR #159): `Zielkarte` oben (Ring sitzt/gesamt, Zeit bis zur Prüfung, Satz; Datum hinter `Details id="karate.datum"`, offen solange kein Datum). „Als Nächstes üben“ (`KarateUeben art="naechstes"`), Programm mit Kyu-Pillen, einer Gruppe zur Zeit (`karate.gruppe`, inkl. „Eigene“), Filter „Noch zu üben · Alles“ (`karate.filter`), Wiederholung unter Kata; Trainings je Woche, Verletzungshinweis und Quelle hinter Details. Auswahl in `lib/karate/ueben.ts`: übe ich vor offen, lange nicht dran zuerst, Gruppen gemischt, bei aktiver Verletzung kein Kumite, 4 Punkte; Tagesauswahl in `settings.data.karate.ueben`, zuletzt dran in `karate.zuletzt`. Heute › Heute steht an: Zeile „Heute üben: …“ bei geplantem Karate (`KarateUebenZeile`). Einheit-Seite: „Was saß heute?“ bei Karate. `saveKarate` lädt Einstellungen frisch (sonst gingen `ueben`/`zuletzt` verloren). Training-Kachel Karate zeigt Fortschritt (`KarateStand`).
- Zielkarten Bouldern und Kettlebell (PR #160): `lib/ziele.ts` (`kbZiel`, `boulderZiel`, nur aus vorhandenen Daten), `Zielkarte` oben auf `/training/bouldern` (ersetzt Karte „Ziel 6A“) und `/training/kettlebell` (ersetzt Kopf „Aktiver Plan“), Kacheln über `ZielStandKurz` (ohne Plan oder Einträge: Trainingstage in 4 Wochen).
- Konzept Einfach Pakete 1–9 umgesetzt. Nächster Schritt: Sichtung durch die Nutzerin auf dem iPhone.

## Karate-Prüfungsprogramm (PR #143, 25.11.)
- Konzept `docs/konzept-karate-pruefungen.md`, freigegeben 25.11. Training › Karate: Kyu-Chips 5.–1., Ring „x von y sitzen“ mit Satz, Gruppen Kihon/Kata/Kumite/Begriffe, Wiederholung eingeklappt, eigene Punkte je Kyu. Drei Stufen per Tipp, Kata und Kumite klappen in Teile auf. „X. Kyu bestanden“ ab Prüfungsdatum, dann rückt der nächste Kyu nach.
- Programm in `lib/karate/programm.ts` nach **DKV Shotokan** (PO ab 01.01.2023, Stand 09.12.2025), von der Nutzerin freigegeben. Gruppen Kihon (Kennung je Grad `kihon.<kyu>.<nr>`), Kata (global `kata.<name>`, Teile), Anwendung, Kumite (je Grad, Teile = Angriffe), Begriffe (zählen nicht im Ring). Hinweise und Kürzel über dem Kihon. Einstellungen `karate.ziel`, `karate.pruefungen[kyu]`, `examDate` bleibt Datum der aktuellen Prüfung (Coach).
- Erledigt 25.11.: Hinweis bei Verletzung nennt den aktuellen Kyu.
- Gemergt 25.11., Migration grün. Nächster Schritt: Nutzerin prüft Training › Karate.













## App-Symbol Blatt mit Puls (25.11.)
- Wunsch der Nutzerin: Vorschlag B statt Ensō. `public/icons/icon.svg`, `icon-dark.svg` und alle PNG (180, 192, 512, 1024) neu, `enso.svg` → `mark.svg` (PIN-Sperre). Login und Seitenleiste nutzen weiter `icon.svg`.
- Aufs iPhone kommt es erst nach Löschen und neu „Zum Home-Bildschirm“.
- Offen für Daten: Store-Icon der Uhr (`watch/store/`) zeigt noch den Ensō.

## Bug: Eisprung an Zyklustag 20 (25.11.)
- Meldung der Nutzerin: Heute zeigte an Tag 20 von etwa 27 „Eisprung“. Ursache: Ein eingetragenes Eisprung-Zeichen galt ungeprüft als Eisprungtag.
- `lib/cycle.ts` `ovulationDay`: Zeichen zählt nur, wenn danach noch mindestens 10 Tage bis zur üblichen Zykluslänge bleiben (`LUTEAL_MIN`), sonst gilt die Schätzung (Länge − 14). Temperaturanstieg allein zählt für den Vortag.
- Erledigt: Nutzerin hat am 25.11. bestätigt, Tag 20 zeigt „Luteal früh“.

## Gewohnheiten im Monat und Monatsrückblick entfernt (PR #140, 25.11.)
- Wunsch der Nutzerin: „Dein Monat“ ersetzt beide. `MonthReviewCard` gelöscht, Karte „Gewohnheiten im …“ aus `OverviewSection` entfernt, tote Stile (`review-*` außer count/number/unit, `habit-month-*`, `habit-week*`) entfernt.
- Wege zu jeder Gewohnheit (CLAUDE.md: jede Gewohnheit hat eine Seite): Tasten unter „Was dir guttut“ (`.habit-link`). CLAUDE.md, `docs/design-konzept-dunkel.md`, `docs/konzept-buendeln.md` angepasst.

## Bündeln Baustein Raster und Rückblick (PR #139, 24.11.) · Konzept Bündeln fertig
- `components/ui/Raster.tsx`: Kästchen-Raster (Wochen × 7, Monatsnamen, Legende), `tone` training/neutral. Genutzt in `HabitCard` (24 Wochen) und `HabitDetail` (13 Wochen). Tagebuch-Raster (Zeile je Symptom, Stärke) bleibt eigen.
- `lib/deinMonat.ts` + Karte „Dein Monat“ auf Gesundheit › Überblick (vor „Gewohnheiten im …“): Werte mit deutlicher Änderung (`monatsBlick.deutlich`: halbe Bereichsbreite, sonst 10 %, nach Runden sichtbar), Training je Sportart und Gewohnheiten (bis heute gegen dieselben Tage im Vormonat, ab 2 bzw. 3 Unterschied). Sätze in `lib/monat.ts` ohne Verb („Schritte: im November im Schnitt …“).
- Offene Frage an die Nutzerin: Laut Vorschlag sollten Monatsrückblick Training und „Gewohnheiten im Monat“ in „Dein Monat“ aufgehen. „Gewohnheiten im Monat“ verlangt CLAUDE.md im Überblick, deshalb beide vorerst geblieben.
- Nächster Schritt: Sichtung durch die Nutzerin am 25.11. (PR #133–#139, Fotos in `docs/bilder/buendeln-*`).

## Bündeln Baustein Zusammenhänge (PR #138, 24.11.)
- `components/ui/Zusammenhang.tsx`: `Zusammenhang` (Kopf, Satz, Sicherheit) und `ZusammenhangListe` (aus `Analysis`, mit Grundlage und „Ein Zusammenhang, kein Beweis“). `Finding.sicherheit` in `lib/muster.ts`: deutlich ab 16 Ereignistagen und je Seite 10 Tagen.
- Eingesetzt: Gesundheit › Weitere Muster (Anzeichen), Körper › Wadenkrämpfe (Überschrift ohne „deutliche“, weil die Sicherheit jetzt je Eintrag steht).
- Bewusst nicht: HRV-Vergleiche je Gewohnheit/Phase (Mittelwerte, keine Häufigkeiten), Korridor „Was davor war“, Training-Insights.

## Bündeln Baustein Wert-Seite (PR #137, 24.11.)
- `app/wert/[name]/page.tsx`: Ring-Seiten (`HeuteDetail`), bei Schlaf/Stress/Belastung darunter `VerlaufView mode="eingebettet"` (Anker `#verlauf`); Werte aus `METRIC_NAMES` (`lib/heuteDetails.ts`, ohne „use client“, Typprüfung gegen `MetricKey` in `lib/garmin.ts`) mit `VerlaufView mode="wert"`; `gewohnheit-<key>` → `HabitDetail`.
- Wichtig: `lib/garmin.ts` ist „use client“, auf dem Server ist `METRICS` nur ein Platzhalter. Prüfungen in Server-Seiten nie mit `in METRICS`.
- `lib/monat.ts` + `components/wert/DieserMonat.tsx`: Schnitt Monat/Vormonat, Tage im Bereich, bester Tag, Satz; `deutlich` für „Dein Monat“ (Baustein 7).
- Verlauf-Übersicht öffnet Werte per Link auf `/wert/<name>`; alte Adressen leiten weiter; interne Links umgestellt.
- Bewusst nicht: Punkte im Diagramm öffnen noch kein Tagesblatt; Highlights und Dieser Monat überschneiden sich teilweise (Highlights = gewählter Zeitraum, Monat = Kalendermonat).

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
