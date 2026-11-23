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

## Erledigt
