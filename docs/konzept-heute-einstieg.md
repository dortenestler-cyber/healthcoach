# Konzept: Heute als ruhige Einstiegsseite

Stand 23.11.2026 · Entwurf zur Sichtung, noch nicht freigegeben. Alle Zahlen im Entwurf sind Beispieldaten.

- Entwurf zum Anklicken: `docs/entwurf-heute-einstieg.html` (auch als Seite in Claude veröffentlicht)
- Prompt, nach dem gearbeitet wurde: `docs/prompt-heute-einstieg.md`
- Vorlagen: neun Bildschirme vom 23.11.2026 (Whoop, Bevel, Sonar), dazu `docs/bilder/vorlagen/`

## Ziel

In 5 Sekunden weiß die Nutzerin, wie es ihr geht und was heute ansteht. Alles Weitere liegt einen Tipp tiefer. Heute hat höchstens 5 Abschnitte, jeder Wert erscheint dort genau einmal.

## Aufbau von Heute (nach Sonar)

1. **Kopf:** Gruß nach Tageszeit, darunter Datum mit ‹ › zum Blättern und „Garmin · Stand 9:12“. Zahnrad für Einstellungen. Sage-Verlauf wie bisher.
2. **Dein Tag:** fünf Ringe in einer wischbaren Reihe. Wort über dem Ring, Zahl im Ring, Zustand darunter. Readiness groß in der Mitte, die äußeren Ringe schauen angeschnitten hervor. Stift: Reihenfolge und Mitte festlegen.
   - Energie: Body Battery jetzt, 0–100, Sage
   - Schlaf: letzte Nacht in % vom Bedarf, neutral
   - Readiness: 0–10, Stufenwort, Sage
   - Belastung: heute in %, Zielbogen außen, Alltag heller, Slate-Blau
   - Stress: Garmin-Tagesschnitt 0–100, Türkis, höher = heller
3. **Ein Satz zum Tag:** eine Erklärkarte mit Stufe, Grund, Vorschlag und Belastungsziel. „Mehr dazu im Coach“ legt die Frage vor, gesendet wird erst nach dem Tippen. Bei Warnzeichen steht hier der Hinweis auf ärztliche Abklärung.
4. **Auf einen Blick:** 2 × 3 Kacheln mit Symbol, Name, Zahl, Wort zur Einordnung. Standard: HRV, Ruhepuls, Atemfrequenz, Hauttemperatur, Zyklus (Tag und Phase), Schlafbedarf heute Nacht. Satz „4 von 4 im Bereich“. Stift: Kacheln wählen (auch Schritte, Tiefschlaf, Gewicht-Trend). Wert seit 3 Tagen außerhalb: Wort in Amber. Ab 5 Tagen Ruhepuls oder Temperatur zusätzlich Hinweis auf ärztliche Abklärung.
5. **Heute steht an:** je eine Zeile für geplantes Training, Medikamente (Anzahl), offenen Check-in, Krankheit oder Verletzung. Erledigtes verschwindet.
6. **Letzte Aktivitäten:** zwei Einheiten mit Sport-Symbol, Dauer, Last. „Alle ›“ öffnet Training.

## Detailseiten (ein Tipp auf einen Ring)

| Ring | Vorlage | Inhalt |
| --- | --- | --- |
| Readiness | Whoop Erholung | großer Ring, Stufenleiste, vier Faktoren mit ▲ ▼ • gegen 30 Tage und Wort, Erklärkarte, Vorschlag zur Zyklusphase, ‹ Heute › |
| Schlaf | Whoop Schlafleistung | Ring % vom Bedarf, fünf Faktoren mit einfarbigem 3-Stufen-Balken (unter · im · über deinem Bereich), Schlafphasen, Schlafbedarf mit Herleitung und Schlafschuld |
| Belastung | Bevel Strain | Halbbogen mit Zielbereich, Wort, Stand; Kacheln Training und Alltag; Erklärung mit Tipp; Verweis auf die Woche |
| Stress | Whoop Stress-Monitor | Halbbogen 0–100 Türkis, Satz zu Ruhe und hohem Stress, Aufteilung Ruhe · niedrig · mittel · hoch, Tag gegen üblichen Wochentag. Ohne Tagesverlauf (Garmin liefert ihn nicht) |
| Energie | Muster 6 | Ring Body Battery, Kurve heute / üblich / Hochrechnung mit Schlaf und Training hinterlegt, aufgeladen und verbraucht, Tagesrhythmus |

## Was wohin wandert

| Heute bisher | Neu |
| --- | --- |
| Drei Ringe | Fünf Ringe |
| Schlafbedarf, Schlafschuld, Herleitung | Kachel Schlafbedarf, Herleitung auf der Schlaf-Seite |
| Readiness-Karte mit Ring, Stufen, Faktoren | Satz auf Heute, Rest auf der Readiness-Seite |
| Belastungszeile | Ring Belastung, Ziel im Satz |
| Deine Werte mit Bereichsbalken und Reitern | Kacheln, Balken im Verlauf |
| Synchronisieren-Knopf | Ziehen zum Aktualisieren, Knopf in Einstellungen › Garmin |
| Energie über den Tag | Ring Energie, Kurve auf der Energie-Seite |
| Zyklustag und Periodenfenster | Kachel Zyklus, Periodenfenster auf der Seite Zyklus |

## Nicht übernommen

Landschaftsfoto als Hintergrund, Schritte und Kalorien als Tagesziel, „Top x %“, biologisches Alter, Blutzucker, Bettzeit, Ampelfarben in den Schlaf-Balken, Markennamen.

## Offene Fragen

1. Energie über den Tag nur als Ring auf Heute, Kurve auf der Energie-Seite? (Ändert eine Zeile in `CLAUDE.md`.)
2. Mitte der Ringreihe: immer Readiness oder der zuletzt angetippte Ring?
3. Sechs oder vier Kacheln bei „Auf einen Blick“?
4. Gruß statt „Heute“ als großer Titel?
5. Synchronisieren-Knopf von Heute weg?

## Umsetzung nach Freigabe

Ein Pull Request für Heute, danach je einer für die Detailseiten (Readiness und Schlaf zuerst). Vorhandene Bausteine: `ValueRing`, `HalfGauge`, `ExplainCard`, `RangeRow`, `SleepStagesBar`, `EnergyChart`. Neu: `RingRow` (wischbar), `GlanceTile`. Keine Änderung an der Datenbank nötig.
