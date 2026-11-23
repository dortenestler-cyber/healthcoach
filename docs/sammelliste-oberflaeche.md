# Sammelliste · Anpassungen Oberfläche

Hier sammelt die Oberfläche (OF) deine Änderungswünsche. Umgesetzt wird erst, wenn du die Liste freigibst, dann alles zusammen in einem Pull Request.
Zweig: `claude/tender-archimedes-h1rwvr`

Zeichen: ☐ gesammelt · ◐ vorbereitet (fertig auf dem Zweig, wartet auf Freigabe) · ☑ umgesetzt und gemergt

## Runde 2 · freigegeben am 23.11., umgesetzt in PR #83

14. ☑ **„Last“ heißt künftig „Belastung“** (23.11., Nutzerin: „Belastung“ statt „Trainingsbelastung“, mit „mit Alltag“ bzw. „nur Training“)
   Betrifft alle sichtbaren Texte: Ring und Erklärkarte auf Training („Trainingsbelastung 7 Tage“), Chart „Trainingsbelastung und Korridor“, Kachel auf Heute, „Letzte Aktivitäten“ („Trainingsbelastung 85“), Begriffe-Seite und die Frage an den Coach.
   Offene Frage: Wenn der Alltag mitzählt, ist es streng genommen keine reine Trainingsbelastung. Vorschlag: überall „Trainingsbelastung“, mit dem Zusatz „mit Alltag“ bzw. „nur Training“ wie heute. Die Belastung in % auf Heute (Ring „Belastung“) bleibt, wie sie ist.
   Dateien: `components/training/RatioCard.tsx`, `LoadTrendCard.tsx`, `components/heute/RecentActivities.tsx`, `lib/today.ts`, `components/BegriffeView.tsx`

15. ☑ **Charts am Computer viel zu groß** (23.11.)
   Ursache: Jeder Chart ist für die iPhone-Breite gezeichnet (340 Punkte) und wird am Computer einfach hochgezogen. Bei 900 px Breite wird alles fast dreimal so groß, auch Schrift, Linien und das Schild beim Antippen.
   Vorschlag: Die Charts messen ihre echte Breite und zeichnen in echten Pixeln. Schrift bleibt immer 11–12 px, Linien bleiben schmal, die Höhe wächst nur leicht (iPhone 170 px, Computer höchstens etwa 220 px). Am Computer entsteht so mehr Platz für Tage statt größerer Zahlen.
   Gilt für alle Charts: Linien, Balken, Schlafphasen, Heatmap, Energie über den Tag, Phasenleiste.
   Dateien: `components/charts/*`, neuer kleiner Helfer zum Messen der Breite, `app/globals.css`

16. ☑ **Verlauf: Werte bündeln** (23.11., Alternative oder Ergänzung zu Punkt 15)
   Heute: 13 Knöpfe nebeneinander, immer nur ein Wert sichtbar.
   Vorschlag: vier Gruppen statt 13 Knöpfen. Jede Gruppe zeigt ihre Werte als kleine Charts untereinander (iPhone) bzw. zwei nebeneinander (Computer), alle mit derselben Zeitachse und einer gemeinsamen Phasenleiste. Fährt man über einen Tag, zeigen alle Charts der Gruppe denselben Tag.
   - **Schlaf:** Schlaf, Tiefschlaf, REM-Schlaf, Einschlafen
   - **Herz und Körper:** HRV, Ruhepuls, Atemfrequenz, Temperatur
   - **Energie und Stress:** Body Battery, Body Battery aufgeladen, Stress, Stress hoch
   - **Bewegung:** Schritte, Alltagsschritte, Trainingsbelastung
   Tippen auf einen kleinen Chart öffnet ihn groß wie heute. Zeitraum T · W · M · 6M · J bleibt oben und gilt für alle.
   Empfehlung: Punkt 15 in jedem Fall, Punkt 16 dazu.
   Dateien: `components/VerlaufView.tsx`, `components/verlauf/*`, `components/charts/pick.tsx` (gemeinsamer Tag)

17. ☑ **Korridor glatt statt Treppe** (23.11.)
   Der persönliche Bereich wird heute Tag für Tag als Stufe gezeichnet. Vorschlag: Ober- und Unterkante als weiche Kurve durch die Tagesmitten. Die Kurve bleibt dabei immer zwischen den echten Tageswerten, sie erfindet keine Spitzen. Lücken ohne Bereich bleiben frei. Das Schild beim Antippen nennt weiter den genauen Bereich des Tages.
   Gilt für alle Charts mit wanderndem Bereich (Verlauf, Detailseiten unter Heute, Trainingsbelastung und Korridor).
   Dateien: `components/charts/LineBand.tsx`, `components/charts/scale.ts`, `components/training/LoadTrendCard.tsx`

18. ☑ **Krankheiten und Verletzungen nachtragen** (23.11.)
   Heute beginnt jede Krankheit und Verletzung „heute“ und endet mit „Wieder gesund“ am selben Tag. Vorschlag:
   - Nach dem Tipp auf eine Krankheit (oder „+ Verletzung eintragen“) fragt eine Zeile **„Seit wann?“** · Heute · Gestern · Vorgestern · Datum wählen.
   - Darunter **„Schon vorbei?“** · Nein, noch krank · Ja, bis … (Datum). So lässt sich auch eine Erkältung von vor drei Wochen in einem Schritt eintragen.
   - „Wieder gesund“ fragt ebenso: heute · gestern · Datum.
   Keine Änderung an der Datenbank nötig, Beginn und Ende gibt es schon. Nachgetragene Tage zählen sofort überall mit: Readiness (Krankheitstage zählen nicht in den Bereich), „Weitere Muster“, Wiedereinstieg in Stufen (nur wenn das Ende höchstens 5 Tage her ist).
   Dateien: `components/gesundheit/IllnessSection.tsx`, `InjurySection.tsx`

19. ☑ **Leichte Anzeichen erfassen, ohne gleich krank zu sein** (23.11.)
   Vorschlag: Im Tagebuch eine eigene Gruppe **„Anzeichen“** neben den Symptomen, per Tipp, jeweils leicht · mittel · stark:
   Rauer Hals · Halsschmerzen · Verstopfte Nase · Schnupfen · Niesen · Husten · Frösteln · Gliederschmerzen · Abgeschlagen · Druck im Kopf/Nebenhöhlen · Lippenbläschen.
   Wie die Symptome gespeichert, deshalb keine Änderung an der Datenbank nötig. Punkt 5e gilt: oben die eingetragenen und häufig genutzten, der Rest unter „Weitere anzeigen“.
   Einbindung in die Mustererkennung:
   - **Frühwarnung:** Treffen Anzeichen auf HRV unter deinem Bereich, Ruhepuls oder Hauttemperatur darüber, steht auf Heute ein ruhiger Hinweis: „Rauer Hals und HRV unter deinem Bereich. Heute lieber locker trainieren.“ Keine Diagnose.
   - **Übergang zur Krankheit:** Werden die Anzeichen an zwei Tagen in Folge stärker, fragt die App „Bist du krank?“ mit einem Tipp auf „Erkältung eintragen“, Beginn am ersten Tag mit Anzeichen (nutzt Punkt 18).
   - **Muster:** Unter Gesundheit › Überblick in „Weitere Muster“ z. B. „Anzeichen kamen 4 von 5 Mal nach einer Woche über deinem Korridor“ oder „… häufiger nach kurzen Nächten“. Nach Zyklusphase in Zyklus › Werte und Symptome. Erst ab genug Tagen, vorher „noch zu wenige Tage“.
   - Der Coach bekommt die Anzeichen der letzten 7 Tage mit, nur Name und Stärke.
   Bei Warnzeichen (Fieber über mehrere Tage, Atemnot, Brustschmerz) bleibt der Hinweis auf ärztliche Abklärung stehen.
   Dateien: `lib/catalog.ts`, Tagebuch-Komponenten, `lib/muster.ts`, `components/heute/*`, `components/gesundheit/OverviewSection.tsx`

20. ☑ **Einträge überall nachträglich ändern** (23.11.)
   Heute lassen sich frühere Krankheiten, Verletzungen und manche Einträge nur ansehen. Vorschlag, einheitlich für alle Listen:
   - Tippen auf einen Eintrag (z. B. „Grippaler Infekt · 23. Nov. · 1 Tag“) öffnet ihn zum Bearbeiten: Name, Beginn, Ende, Stärke, Fieber, Notiz; bei Verletzungen Stelle, Art, Ursache, Schmerzwerte.
   - Unten immer **„Löschen“**, mit Rückfrage.
   - Gilt für: Krankheiten, Verletzungen, Medikamente und Supplements (auch frühere), Einnahmen, Perioden, Körperwerte, Wadenzucken, Gewohnheiten mit Details (z. B. Sauna) und Tagebuch-Tage (über ‹ › im Tagebuch, das geht schon).
   - Ein Stift-Symbol rechts in der Zeile zeigt, dass man tippen kann (Tippfläche 44 px).
   Ich gehe beim Umsetzen alle Bereiche durch und liste vorher auf, wo heute etwas fehlt.
   Dateien: `components/gesundheit/*`, `components/tagebuch/*`, `components/zyklus/*`, neuer gemeinsamer Bearbeiten-Bogen in `components/ui/`

21. ☑ **Daten regelmäßig aktualisieren** (23.11., Teil A umgesetzt; Teil B liegt bei Daten `[DA]`)
   Konzept: `docs/konzept-datenaktualisierung.md`. Umgesetzt: `lib/refresh.ts` (neu laden beim Zurückkehren, alle 15 Minuten, beim Tageswechsel), Garmin-Abruf ab 60 Minuten altem Stand, ab 20 Minuten wenn heute Training geplant ist und die Aktivität fehlt (höchstens alle 30 Minuten je Gerät), Hinweis „Neue Version“ (`/version`), „Aktualisieren“ in der Seitenleiste. A6 (zentraler Datenspeicher) ersetzt durch den gemeinsamen Hook.

## Runde 1 · umgesetzt in PR #77


1. ☑ **Coach: Eingabefeld zu klein** (23.11.)
   Das Feld ist jetzt so breit wie möglich, zeigt drei Zeilen und wächst beim Schreiben mit (höchstens 40 % der Bildschirmhöhe). Senden steht rechts unten daneben. Die Scrollleiste unter den Vorschlägen ist ausgeblendet, man kann weiterhin seitlich wischen.
   Dateien: `components/CoachView.tsx`, `app/globals.css`

2. ☑ **Zyklus-Kalender: Vorschau auf die nächsten Perioden** (23.11.)
   Heute bleiben alle kommenden Tage nach dem Ende des aktuellen Zyklus in „Luteal“ hängen, die nächste Periode ist nicht zu sehen.
   Vorschlag: Ab dem geschätzten Beginn rechnet der Kalender mit deiner üblichen Zykluslänge weiter. Erwartete Periodentage in Menstruationsfarbe, gestrichelt wie alle geschätzten Tage; Follikel, Eisprung und Luteal folgen danach. So weit nach vorn blättern, wie es sinnvoll ist (etwa drei Zyklen). Weil die Zyklen in der Perimenopause schwanken, steht über dem Kalender das Fenster als Satz, z. B. „Nächste Periode etwa 24.–29. Dez.“. Sobald du eine echte Blutung einträgst, verschiebt sich die Vorschau.
   Dateien: `components/zyklus/CycleCalendar.tsx`, evtl. `lib/cycle.ts`

3. ☑ **Zyklus-Ring: Phasen mit Datum zeigen** (23.11.)
   Mit der Maus über einen Bogen fahren oder auf einen Bogen tippen zeigt die Phase mit Zeitraum, z. B. „Eisprung · 18.–20. Nov. · Tag 13–15“. Die Anzeige erscheint in der Mitte des Rings anstelle von „Tag 18“. Noch einmal tippen oder daneben tippen führt zurück. Geschätzte Tage sind als „etwa“ gekennzeichnet. Jeder Bogen bekommt eine Tippfläche von mindestens 44 px und eine Beschriftung für den Screenreader.
   Dateien: `components/zyklus/CycleRing.tsx`

4. ☑ **Heute: Medikamente und Supplements zusammenklappen, wenn alles abgehakt ist** (23.11.)
   Sobald alle festen Einnahmen des Tages abgehakt sind, zeigt Heute statt der Liste nur noch eine Zeile: „✓ Medikamente und Supplements · alles genommen (5 von 5)“ mit Pfeil. Tippen klappt die Liste wieder auf, z. B. um etwas rückgängig zu machen. „Bufori bei Bedarf“ mit „+ Hub“ bleibt sichtbar, weil man es jederzeit spontan braucht. „Krank oder verletzt?“ bleibt ebenfalls. Im Tagebuch bleibt die volle Liste.
   Dateien: `components/HealthToday.tsx`, evtl. `components/IntakeChecklist.tsx`

5. ☑ **Generell: Was noch eingeklappt werden kann** (23.11., alle Unterpunkte 5a–5h übernommen)
   Regel für alle Punkte: Erledigtes klappt zu einer Zeile mit ✓ zusammen, Offenes bleibt offen. Warnungen, Hinweise auf ärztliche Abklärung und Krankheit/Verletzung werden nie eingeklappt. Eine Zeile lässt sich immer per Tipp aufklappen. Am nächsten Tag ist alles wieder offen.
   - 5a **Heute · Geplantes Training:** Nach dem Training (Garmin-Aktivität passt zum Plan) nur noch „✓ Kettlebell erledigt · 42 min“.
   - 5b **Heute · „Krank oder verletzt?“:** Statt eigener Zeile mit zwei Knöpfen ein kleiner Link am Ende der Karte „Krank oder verletzt? ›“.
   - 5c **Tagebuch · Medikamente und Supplements:** dasselbe wie Punkt 4, wenn alles abgehakt ist.
   - 5d **Tagebuch · Check-in:** Nach dem Speichern nur noch eine Zeile mit den Werten, z. B. „✓ Check-in · Schlaf gut · Energie 7“, Tipp zum Ändern.
   - 5e **Tagebuch · Symptome und Gewohnheiten:** Oben stehen die heute eingetragenen und die, die du oft nutzt. Der Rest liegt hinter „Weitere anzeigen“.
   - 5f **Gesundheit · Medikamente:** Das Formular „Neues Mittel“ erst nach Tipp auf „+ Neues Mittel“. „Frühere Mittel“ eingeklappt.
   - 5g **Gesundheit · Krank & verletzt:** „Frühere Verletzungen“ und der Krankheits-Verlauf eingeklappt. Die Körperkarte „Wo tut es weh?“ erst nach Tipp auf „+ Verletzung“.
   - 5h **Gesundheit · Körper:** Die Erklärung „So geht die App mit deinen Werten um“ eingeklappt.
   Schon eingeklappt sind: Verlauf 4 Wochen im Tagebuch, Faktoren auf der Readiness-Seite, Check-in-Hinweis auf Heute (verschwindet nach dem Check-in).

6. ☑ **Unklare Garmin-Aktivität: Coach fragt nach** (23.11.)
   Wenn eine Aktivität bei „Sonstiges“ landet, erscheint auf Heute unter „Heute steht an“ eine Frage mit dem Coach-Zeichen: „Was war das am Mo, 16. Nov., 1:44 h, Puls Ø 133?“. Darunter stehen Knöpfe: Karate · Kettlebell · Bouldern · Ausdauer · Anderes … (eigener Name) · „Nicht zuordnen“. Nach dem Tipp zählt die Aktivität überall zur gewählten Sportart (Kalender, Belastung, Training). Dafür ist keine Anfrage an Claude nötig, also entstehen keine Kosten. Ist der Coach ausgeschaltet, steht die Frage ohne Coach-Zeichen da.
   Braucht Daten `[DA]`: eine Spalte für die eigene Zuordnung in `garmin_activities` (Migration, wartet auf Freigabe). `garmin-sync` darf sie beim nächsten Abruf nicht überschreiben.
   Dateien OF: `lib/training.ts` (Zuordnung lesen), neue Karte unter `components/heute/`

7. ☑ **Heute: Garmin-Stand als Punkt am Zahnrad** (23.11.)
   Die Zeile „Garmin · Stand 08:02 · nach unten ziehen zum Aktualisieren“ unter dem Datum fällt weg. Am Zahnrad oben rechts sitzt stattdessen ein kleiner Punkt:
   - Daten jünger als 30 Minuten: kein Punkt
   - 30 Minuten bis 1 Stunde: grauer Punkt (gedämpft)
   - älter als 1 Stunde oder Abruf fehlgeschlagen: Amber-Punkt
   Damit der Punkt nicht ohne Text steht: Die Beschriftung des Zahnrads lautet z. B. „Einstellungen · Garmin-Daten von 08:02, älter als 1 Stunde“. Unter Einstellungen › Garmin steht der Stand als Satz. Fehlermeldungen beim Abruf bleiben wie bisher auf Heute sichtbar. Ziehen zum Aktualisieren bleibt, der Hinweis darauf steht nur noch beim Ziehen selbst.
   Dateien: `components/heute/DayHead.tsx`, `app/globals.css`

8. ☑ **Charts: schönere Darstellung der Zyklusphasen** (23.11.)
   Bisher sind die Phasen als hohe, getönte Flächen hinter die ganze Kurve gelegt. Sie konkurrieren mit Linie und Bereich, die Farben wirken trüb, und der Eisprung fehlt.
   Vorschlag (angelehnt an Whoop und Oura):
   - **Phasenleiste unter der Zeitachse:** eine schmale, abgerundete Leiste (etwa 6 px) mit kleinen Lücken zwischen den Phasen, in denselben Farben wie Ring und Kalender: Menstruation Rosa, Follikel neutral grau, Eisprung Terracotta mittel, Luteal Terracotta. Geschätzte Tage gestrichelt bzw. heller.
   - **Beschriftung in der Leiste**, wenn genug Platz ist („Mens.“, „Follikel“, „Luteal“), sonst nur Farbe. Die eigene Legende unter dem Chart fällt dann weg.
   - **Diagrammfläche bleibt ruhig:** kein Hintergrund mehr. Nur am ersten Periodentag eine feine senkrechte Linie mit kleinem Tropfen oben, so sieht man die Zyklusgrenzen.
   - **Tippen auf die Leiste** tönt die gewählte Phase kurz ganz leicht im Chart ein und nennt sie mit Datum, passend zu Punkt 3.
   - Gilt für alle Charts mit Phasen: HRV, Schlaf, Ruhepuls, Verlauf, Detailseiten unter Heute.
   Entwurf mit Beispieldaten: `docs/bilder/entwuerfe/zyklusphasen-charts.png` (zeigt auch Punkt 9).
   Dateien: `components/charts/LineBand.tsx`, `components/heute/HrvCard.tsx`, `components/verlauf/VerlaufDetail.tsx`, `app/globals.css`

9. ☑ **Charts: Tippen auf einen Datenpunkt zeigt Wert und Datum** (23.11.)
   Bisher reagiert kein Chart auf Tippen.
   Vorschlag: Tippen oder mit dem Finger über den Chart fahren setzt eine feine senkrechte Linie mit Punkt auf den nächsten Tag. Darüber erscheint ein kleines Schild, z. B. „Mo, 16. Nov. · 8:57 h“. Dazu, wo es passt, ein zweites Wort: „im Bereich“ oder „über deinem Bereich“, und die Zyklusphase. Am Computer geht es auch mit der Maus. Das Schild verschwindet nach Tippen daneben oder nach ein paar Sekunden. Fehlende Tage zeigen „kein Wert“. Für den Screenreader bekommt jeder Punkt die Beschriftung „Datum, Wert“.
   Einmal gebaut für alle Charts: Linien (`LineBand`), Balken (`DayBars`, `DivergingBars`), Schlafphasen (`SleepStagesBar`), Heatmap.
   Dateien: `components/charts/*`, `app/globals.css`

10. ☑ **Eisprung als eigene Phase überall** (23.11.)
   Ring und Kalender zeigen den Eisprung schon. In allen Auswertungen zählt er bisher aber zur Follikelphase (`groupOf` in `lib/cycle.ts`).
   Künftig gibt es überall vier Phasen: Menstruation · Follikel · Eisprung · Luteal. Das gilt für die Charts (Punkt 8), Werte und Symptome nach Phase, Gewohnheiten je Phase, „Weitere Muster“, Wadenzucken nach Phase und die Gewohnheits-Detailseiten. Farbe: Terracotta mittel wie im Kalender.
   Der Eisprung dauert nur etwa 3 Tage je Zyklus. Vergleiche stehen deshalb erst, wenn genug Tage zusammenkommen, vorher „noch zu wenige Tage“.
   Die Readiness rechnet ihren Bereich je Phase. Ob der Eisprung dort eigenständig zählt oder bei Follikel bleibt, entscheide ich beim Umsetzen nach Datenlage. Die Uhr muss dann gleich rechnen `[DA]`.
   **Eisprung selbst eintragen** (Nutzerin: ja): Im Tagebuch gibt es beim Zyklus eine Zeile „Eisprung-Zeichen“ zum Antippen, mehrere sind möglich: Test positiv · Mittelschmerz · Zervixschleim spinnbar · Temperaturanstieg. Ein eingetragenes Zeichen ersetzt für diesen Zyklus die Schätzung: Eisprung-Phase und Lutealphase richten sich danach. Ring, Kalender und Vorschau auf die nächste Periode (Punkt 2) werden genauer. Im Kalender bekommt der Tag ein kleines Zeichen.
   Braucht Daten `[DA]`: ein neues Feld im Tagebuch (Migration, wartet auf Freigabe).
   Dateien: `lib/cycle.ts`, `lib/muster.ts`, `lib/zyklusSeite.ts`, `lib/habitStats.ts`, betroffene Komponenten

11. ☑ **App-Symbol passend zum getönten Home-Bildschirm** (23.11., freigegeben, grüne Fassung)
   Mit getönten Symbolen rechnet iOS das Symbol einer Web-App selbst um. Eine eigene getönte Fassung kann man nicht mitgeben, darum wurde der Ring in Beere zu flauem Grau.
   Umgesetzt auf dem Zweig: Ensō in Sage hell (`#D2F1E0` → `#8FD5B0`, Familie Erholung/Energie) auf dunklem Grüngrau, Strich etwas kräftiger, Ring kleiner mit mehr Rand, keine eigenen runden Ecken. Alle PNG-Größen neu. Sperrbildschirm: Ring und Schimmer ebenfalls grün. Der Coach-Knopf bleibt Beere. `CLAUDE.md` und Designkonzepte angepasst. Neu hinzufügen auf dem iPhone: `AUFGABEN.md`.
   Entwurf: `docs/bilder/entwuerfe/app-symbol-getoent.png`.
   Dateien: `public/icons/*`, `app/globals.css` (`.pin-glow`), `CLAUDE.md`, `docs/farb-und-designkonzept.md`, `docs/design-konzept-dunkel.md`

12. ☑ **Weitere übliche Zyklus-Symptome im Tagebuch** (23.11.)
   Die Symptome werden schon flexibel gespeichert, deshalb ist keine Änderung an der Datenbank nötig. Vorschlag zum Auswählen, jeweils leicht · mittel · stark:
   Unterleibskrämpfe · Brustspannen · Blähbauch/Wassereinlagerungen · Heißhunger · Rückenschmerzen · Hautunreinheiten · Übelkeit · Ängstlichkeit/innere Unruhe · Schwindel · Libido verändert · Schmierblutung (als Hinweis, getrennt von der Blutung).
   Damit das Tagebuch nicht länger wird, gilt Punkt 5e: Oben stehen die eingetragenen und häufig genutzten, der Rest liegt unter „Weitere anzeigen“. Auswertungen nach Zyklusphase (mit Eisprung, Punkt 10) zeigen die neuen Symptome automatisch mit.
   Dateien: `lib/catalog.ts`, Tagebuch-Komponenten

13. ☑ **Health Coach im Browser am Computer, keine PIN im Browser, Anmeldung bleibt bestehen** (23.11.)
   Eigenes Konzept zur Sichtung: `docs/konzept-web-app.md`, Entwurf `docs/bilder/entwuerfe/web-heute.png`. Wird nach Freigabe in Schritten umgesetzt.

## Erledigt
