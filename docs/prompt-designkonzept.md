# Prompt: Design-Konzept „dunkel 2“ einhalten

Diesen Text an den Anfang einer neuen Sitzung stellen, wenn ein Bildschirm neu gebaut oder umgebaut wird.

```text
Setze das Design-Konzept „Health Coach dunkel 2“ um bzw. halte es ein.
Grundlage: docs/design-konzept-dunkel.md (Abschnitt „Konzept dunkel 2“) und die Vorlagen
in docs/bilder/vorlagen/ (01–16). Öffne JEDE Vorlage, die zum Bildschirm gehört, bevor du
Code schreibst, und beschreibe sie mir in 3–5 Stichpunkten (Aufbau von oben nach unten,
Größenverhältnisse, Abstände, Schriftgrößen, Form der Diagramme).

Regeln:
1. Übernimm Aufbau, Reihenfolge, Proportionen und Diagrammformen der Vorlage 1:1.
   Erfinde keine eigenen Layouts. Wenn etwas nicht passt, frag mich, statt abzuweichen.
2. Nutze die vorhandenen Bausteine: ValueRing, HalfGauge, ExplainCard, DivergingBars,
   CycleRing, CycleCalendar, RangeRow, ZoneScale, LineBand, DayBars, PageHead mit tone.
3. Übernimm NICHT: Markennamen, Logos, Texte der Vorlagen, Ampel-Verläufe, Bettzeit,
   biologisches Alter, Vergleich mit anderen, Kalorienziele, Hormon-Versprechen.
4. Farben, Radien und Abstände nur aus app/globals.css (CLAUDE.md, Abschnitt Design).
   Jede Farbe steht mit Zahl oder Wort. Stress ist Türkis, höher = heller.
5. Texte auf Deutsch, knapp, ohne Fachjargon. Zusammenhänge, keine Ursachen, keine Diagnosen.
   Der Coach-Einstieg belegt nur eine Frage vor, gesendet wird erst nach dem Tippen.
6. Ein Bildschirm pro Pull Request.

Abnahme für jeden Bildschirm:
- Bildschirmfoto bei 390 × 844 (immer dunkel) NEBEN der Vorlage in den Pull Request
  (Beispieldaten, als solche gekennzeichnet).
- Tabelle „Muster aus Vorlage → umgesetzt ja/nein/abgewandelt, warum“.
- Liste jeder Abweichung von der Vorlage mit Grund. Ohne Grund wird zurückgebaut.
- Kein waagerechtes Scrollen bei 390 px Breite.
- tsc und npm run build fehlerfrei, Tap-Ziele ≥ 44 px, Kontrast AA.
```

## Vorlagen

| Datei | Zeigt | Verwendet für |
| --- | --- | --- |
| 01-stress-halbbogen | Halbbogen 0–3, Tagesverlauf mit Schlaf und Training, Satz zur längsten Stressphase | Muster 2, 3, 6, Stress-Tagesrückblick |
| 02-zyklus-kalender-baender | Monat mit Phasenbändern, geschätzte Tage, Symptom-Punkt, „Periode eintragen +“ | Muster 9, 10 |
| 03-einfluesse-nullpunkt | Balken um den Nullpunkt, schraffiert, „Neu“ | Muster 11 |
| 04-coach-chat | Chat mit eigenen Daten | Muster 17 |
| 05-gesundheitsspanne-nicht-uebernehmen | Biologisches Alter | nicht übernommen |
| 06-erholung-ring-faktoren | Großer Ring, Faktoren mit Pfeil, Erklärkarte | Muster 1, 3 |
| 07-belastung-halbbogen-ziel | Halbbogen mit Ziel, zwei Kacheln, Erklärung mit Tipp | Muster 2, 3, 10 |
| 08-lastkurve-zonenskala | Lastkurve mit Band, Zonenskala mit Punkt, 1M · 3M · 6M | Muster 12 |
| 09-zielringe-auf-einen-blick | Ziel-Ringe in einer Reihe, Kacheln | Muster 5 |
| 10-uebersicht-ring-kennzahlen | Ring links, Kennzahlen rechts | Muster 4 |
| 11-schlaf-coach | Schlafbedarf, Schlafschuld (Bettzeit nicht übernommen) | Schlafschuld als Satz |
| 12-gewohnheiten-raster | Raster je Tag, Serie, Bestwert | Muster 15 |
| 13-trainingslast-status | Statuswort, Ring, „Was das heißt“, Beiträge | Muster 13, 14 |
| 14-monatsrueckblick | Monat mit Sport-Blasen, Anzahl | Muster 16 |
| 15-stress-diagramm-aufteilung | Kennzahlen, Diagramm, Aufteilung | Muster 6, 7 |
| 16-zyklus-ring | Ring mit vier Phasen, Symbole, Phasenkarte | Muster 8 |
