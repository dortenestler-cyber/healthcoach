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

## Erledigt
