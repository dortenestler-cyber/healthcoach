# Sammelliste · Anpassungen Oberfläche

Hier sammelt die Oberfläche (OF) deine Änderungswünsche. Umgesetzt wird erst, wenn du die Liste freigibst, dann alles zusammen in einem Pull Request.
Zweig: `claude/kind-keller-hmdy0s`

Zeichen: ☐ gesammelt · ◐ vorbereitet (fertig auf dem Zweig, wartet auf Freigabe) · ☑ umgesetzt und gemergt

## Offen

1. ◐ **Coach: Eingabefeld zu klein** (23.11.)
   Das Feld ist jetzt so breit wie möglich, zeigt drei Zeilen und wächst beim Schreiben mit (höchstens 40 % der Bildschirmhöhe). Senden steht rechts unten daneben. Die Scrollleiste unter den Vorschlägen ist ausgeblendet, man kann weiterhin seitlich wischen.
   Dateien: `components/CoachView.tsx`, `app/globals.css`

2. ☐ **Zyklus-Kalender: Vorschau auf die nächsten Perioden** (23.11.)
   Heute bleiben alle kommenden Tage nach dem Ende des aktuellen Zyklus in „Luteal“ hängen, die nächste Periode ist nicht zu sehen.
   Vorschlag: Ab dem geschätzten Beginn rechnet der Kalender mit deiner üblichen Zykluslänge weiter. Erwartete Periodentage in Menstruationsfarbe, gestrichelt wie alle geschätzten Tage; Follikel, Eisprung und Luteal folgen danach. So weit nach vorn blättern, wie es sinnvoll ist (etwa drei Zyklen). Weil die Zyklen in der Perimenopause schwanken, steht über dem Kalender das Fenster als Satz, z. B. „Nächste Periode etwa 24.–29. Dez.“. Sobald du eine echte Blutung einträgst, verschiebt sich die Vorschau.
   Dateien: `components/zyklus/CycleCalendar.tsx`, evtl. `lib/cycle.ts`

3. ☐ **Zyklus-Ring: Phasen mit Datum zeigen** (23.11.)
   Mit der Maus über einen Bogen fahren oder auf einen Bogen tippen zeigt die Phase mit Zeitraum, z. B. „Eisprung · 18.–20. Nov. · Tag 13–15“. Die Anzeige erscheint in der Mitte des Rings anstelle von „Tag 18“. Noch einmal tippen oder daneben tippen führt zurück. Geschätzte Tage sind als „etwa“ gekennzeichnet. Jeder Bogen bekommt eine Tippfläche von mindestens 44 px und eine Beschriftung für den Screenreader.
   Dateien: `components/zyklus/CycleRing.tsx`

4. ☐ **Heute: Medikamente und Supplements zusammenklappen, wenn alles abgehakt ist** (23.11.)
   Sobald alle festen Einnahmen des Tages abgehakt sind, zeigt Heute statt der Liste nur noch eine Zeile: „✓ Medikamente und Supplements · alles genommen (5 von 5)“ mit Pfeil. Tippen klappt die Liste wieder auf, z. B. um etwas rückgängig zu machen. „Bufori bei Bedarf“ mit „+ Hub“ bleibt sichtbar, weil man es jederzeit spontan braucht. „Krank oder verletzt?“ bleibt ebenfalls. Im Tagebuch bleibt die volle Liste.
   Dateien: `components/HealthToday.tsx`, evtl. `components/IntakeChecklist.tsx`

5. ☐ **Generell: Was noch eingeklappt werden kann** (23.11., alle Unterpunkte 5a–5h übernommen)
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

6. ☐ **Unklare Garmin-Aktivität: Coach fragt nach** (23.11.)
   Wenn eine Aktivität bei „Sonstiges“ landet, erscheint auf Heute unter „Heute steht an“ eine Frage mit dem Coach-Zeichen: „Was war das am Mo, 16. Nov., 1:44 h, Puls Ø 133?“. Darunter stehen Knöpfe: Karate · Kettlebell · Bouldern · Ausdauer · Anderes … (eigener Name) · „Nicht zuordnen“. Nach dem Tipp zählt die Aktivität überall zur gewählten Sportart (Kalender, Belastung, Training). Dafür ist keine Anfrage an Claude nötig, also entstehen keine Kosten. Ist der Coach ausgeschaltet, steht die Frage ohne Coach-Zeichen da.
   Braucht Daten `[DA]`: eine Spalte für die eigene Zuordnung in `garmin_activities` (Migration, wartet auf Freigabe). `garmin-sync` darf sie beim nächsten Abruf nicht überschreiben.
   Dateien OF: `lib/training.ts` (Zuordnung lesen), neue Karte unter `components/heute/`

7. ☐ **Heute: Garmin-Stand als Punkt am Zahnrad** (23.11.)
   Die Zeile „Garmin · Stand 08:02 · nach unten ziehen zum Aktualisieren“ unter dem Datum fällt weg. Am Zahnrad oben rechts sitzt stattdessen ein kleiner Punkt:
   - Daten jünger als 30 Minuten: kein Punkt
   - 30 Minuten bis 1 Stunde: grauer Punkt (gedämpft)
   - älter als 1 Stunde oder Abruf fehlgeschlagen: Amber-Punkt
   Damit der Punkt nicht ohne Text steht: Die Beschriftung des Zahnrads lautet z. B. „Einstellungen · Garmin-Daten von 08:02, älter als 1 Stunde“. Unter Einstellungen › Garmin steht der Stand als Satz. Fehlermeldungen beim Abruf bleiben wie bisher auf Heute sichtbar. Ziehen zum Aktualisieren bleibt, der Hinweis darauf steht nur noch beim Ziehen selbst.
   Dateien: `components/heute/DayHead.tsx`, `app/globals.css`

8. ☐ **Charts: schönere Darstellung der Zyklusphasen** (23.11.)
   Bisher sind die Phasen als hohe, getönte Flächen hinter die ganze Kurve gelegt. Sie konkurrieren mit Linie und Bereich, die Farben wirken trüb, und der Eisprung fehlt.
   Vorschlag (angelehnt an Whoop und Oura):
   - **Phasenleiste unter der Zeitachse:** eine schmale, abgerundete Leiste (etwa 6 px) mit kleinen Lücken zwischen den Phasen, in denselben Farben wie Ring und Kalender: Menstruation Rosa, Follikel neutral grau, Eisprung Terracotta mittel, Luteal Terracotta. Geschätzte Tage gestrichelt bzw. heller.
   - **Beschriftung in der Leiste**, wenn genug Platz ist („Mens.“, „Follikel“, „Luteal“), sonst nur Farbe. Die eigene Legende unter dem Chart fällt dann weg.
   - **Diagrammfläche bleibt ruhig:** kein Hintergrund mehr. Nur am ersten Periodentag eine feine senkrechte Linie mit kleinem Tropfen oben, so sieht man die Zyklusgrenzen.
   - **Tippen auf die Leiste** tönt die gewählte Phase kurz ganz leicht im Chart ein und nennt sie mit Datum, passend zu Punkt 3.
   - Gilt für alle Charts mit Phasen: HRV, Schlaf, Ruhepuls, Verlauf, Detailseiten unter Heute.
   Entwurf mit Beispieldaten: `docs/bilder/entwuerfe/zyklusphasen-charts.png` (zeigt auch Punkt 9).
   Dateien: `components/charts/LineBand.tsx`, `components/heute/HrvCard.tsx`, `components/verlauf/VerlaufDetail.tsx`, `app/globals.css`

9. ☐ **Charts: Tippen auf einen Datenpunkt zeigt Wert und Datum** (23.11.)
   Bisher reagiert kein Chart auf Tippen.
   Vorschlag: Tippen oder mit dem Finger über den Chart fahren setzt eine feine senkrechte Linie mit Punkt auf den nächsten Tag. Darüber erscheint ein kleines Schild, z. B. „Mo, 16. Nov. · 8:57 h“. Dazu, wo es passt, ein zweites Wort: „im Bereich“ oder „über deinem Bereich“, und die Zyklusphase. Am Computer geht es auch mit der Maus. Das Schild verschwindet nach Tippen daneben oder nach ein paar Sekunden. Fehlende Tage zeigen „kein Wert“. Für den Screenreader bekommt jeder Punkt die Beschriftung „Datum, Wert“.
   Einmal gebaut für alle Charts: Linien (`LineBand`), Balken (`DayBars`, `DivergingBars`), Schlafphasen (`SleepStagesBar`), Heatmap.
   Dateien: `components/charts/*`, `app/globals.css`

10. ☐ **Eisprung als eigene Phase überall** (23.11.)
   Ring und Kalender zeigen den Eisprung schon. In allen Auswertungen zählt er bisher aber zur Follikelphase (`groupOf` in `lib/cycle.ts`).
   Künftig gibt es überall vier Phasen: Menstruation · Follikel · Eisprung · Luteal. Das gilt für die Charts (Punkt 8), Werte und Symptome nach Phase, Gewohnheiten je Phase, „Weitere Muster“, Wadenzucken nach Phase und die Gewohnheits-Detailseiten. Farbe: Terracotta mittel wie im Kalender.
   Der Eisprung dauert nur etwa 3 Tage je Zyklus. Vergleiche stehen deshalb erst, wenn genug Tage zusammenkommen, vorher „noch zu wenige Tage“.
   Die Readiness rechnet ihren Bereich je Phase. Ob der Eisprung dort eigenständig zählt oder bei Follikel bleibt, entscheide ich beim Umsetzen nach Datenlage. Die Uhr muss dann gleich rechnen `[DA]`.
   Offen: Willst du den Eisprung auch selbst eintragen können (z. B. Test positiv, Mittelschmerz)? Dann bräuchte das Tagebuch ein neues Feld, und das wäre eine Migration durch Daten `[DA]`.
   Dateien: `lib/cycle.ts`, `lib/muster.ts`, `lib/zyklusSeite.ts`, `lib/habitStats.ts`, betroffene Komponenten

## Erledigt
