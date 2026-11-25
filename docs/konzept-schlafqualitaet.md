# Konzept: Schlaf auch nach Qualität bewerten

Stand: 25.11.2026 · Status: **Freigegeben (25.11.)** · umgesetzt in `lib/schlaf.ts`

Anlass: Die Schlafseite bewertet nur die Menge („94 % vom Bedarf“). Tiefschlaf und REM stehen als Minuten daneben, fließen aber nicht ein. Eine Nacht mit 8:35 h, aber fünfmal wach und Nachtschweiß sieht genauso gut aus wie eine ruhige Nacht.

## 1. Zwei Fragen, eine Zahl
Die Seite beantwortet zwei Fragen getrennt und fasst sie im Ring zusammen:

| | Frage | Wert |
|---|---|---|
| **Menge** | Hast du genug geschlafen? | % vom Bedarf (wie bisher, bis 100 gedeckelt) |
| **Erholsam** | War der Schlaf gut? | 0–100 aus fünf Bausteinen (Abschnitt 2) |
| **Schlaf** (Ring) | Gesamt | 0,5 × Menge + 0,5 × Erholsam |

- Ring in der Mitte: „**Schlaf 82**“ mit Wort (gut / mittel / wenig erholsam), darunter zwei Kacheln „Menge 94 %“ und „Erholsam 71“.
- Der Ring auf Heute zeigt dieselbe Gesamtzahl. Readiness nutzt künftig die Gesamtzahl statt nur der Dauer.
- Grenzen fürs Wort: ab 85 gut, ab 70 mittel, darunter wenig erholsam. Keine Ampelfarben, alles in Schlaf-Neutral `#E5E7EB`.

## 2. Bausteine für „Erholsam“
Jeder Baustein gibt 0–100 Punkte. Maßstab ist, wo möglich, dein eigener Bereich der letzten 30 Nächte (wie bei den Faktoren heute), ergänzt um feste Grenzen, wo es allgemein gültige gibt.

| Baustein | Gewicht | Grundlage (vorhandene Spalten) | Volle Punkte |
|---|---|---|---|
| **Durchschlafen** | 30 % | `awake_count`, `sleep_awake_s` | höchstens 2× wach und unter 20 min wach; Abzug je weiterem Aufwachen und je 10 min |
| **Effizienz** | 20 % | Schlafzeit ÷ (Schlafzeit + Wachzeit) | ab 90 %, null Punkte bei 75 % |
| **Tief- und REM-Schlaf** | 25 % | `sleep_deep_s`, `sleep_rem_s` als **Anteil** an der Schlafzeit | im eigenen Bereich; darunter anteilig weniger |
| **Regelmäßigkeit** | 10 % | `sleep_start_min`, `sleep_end_min` | Einschlafen und Aufwachen höchstens 30 min von deinem Mittel der letzten 7 Nächte entfernt; null Punkte ab 2 h |
| **Erholung des Körpers** | 15 % | `resting_hr`, `hrv_last_night`, `respiration_avg` | alle drei im eigenen Bereich; je Wert außerhalb ein Drittel weniger |

- Anteile statt Minuten bei Tief- und REM-Schlaf, damit eine lange Nacht nicht automatisch gut aussieht.
- Fehlt ein Baustein (z. B. keine Phasen), werden die übrigen neu gewichtet. Unter drei Bausteinen gibt es keinen Wert „Erholsam“, nur die Menge.
- Eigener Bereich erst ab 14 Nächten, vorher feste Startwerte (Tiefschlaf 13–23 %, REM 18–25 %).
- Garmins eigener Schlafwert (`sleep_score`) wird in der App nicht mehr verwendet (Nutzerin 25.11.: ganz entfernen; Uhr, Abruf und Spalte siehe Übergabe Daten).

## 3. Zyklus und Perimenopause
- **Lutealphase:** Ruhepuls höher, Tiefschlaf oft weniger. Sobald zwei Zyklen Daten da sind, gilt für „Erholung des Körpers“ und „Tief- und REM-Schlaf“ der Bereich derselben Phase, nicht der letzten 30 Nächte. Sonst wird jede Lutealphase als schlecht bewertet.
- **Hitzewallung, Nachtschweiß** (Tagebuch): fließen nicht in die Zahl ein, aber in den Satz. Bei einer unruhigen Nacht mit Eintrag: „5× wach, Nachtschweiß eingetragen.“
- Unter Gesundheit › Muster: „Nächte mit Nachtschweiß: im Schnitt 3× öfter wach“, sobald genug Nächte da sind (nutzt die vorhandene Muster-Logik).

## 4. Schlafseite neu
Reihenfolge von oben:
1. Ring „Schlaf 82“ mit Wort, darunter die Kacheln Menge und Erholsam.
2. **Ein Satz**, der den schwächsten Baustein nennt, z. B. „Genug geschlafen, aber 5× wach. Tiefschlaf im Bereich.“ Ersetzt den heutigen Satz „3 von 3 Werten in deinem Bereich“.
3. **Faktoren** (`FactorList`, drei Stufen wie heute): Dauer · Effizienz · Wach · Tiefschlaf · REM · Regelmäßigkeit · Ruhepuls · HRV · Atem. Die Legenden-Zeile „unter · im · über deinem Bereich (letzte 30 Nächte)“ entfällt (Regel: keine Legenden-Sätze).
4. Schlafbedarf heute Nacht (wie bisher).
5. 7 Nächte: Balken für Menge, Punkt für Erholsam, damit beides im Verlauf sichtbar wird. Überschrift mit Ergebnis-Satz, z. B. „Diese Woche erholsamer als die Woche davor.“
- **Sauerstoff:** nur als Warnzeichen, nicht in der Zahl. Liegt der niedrigste Wert in 3 von 7 Nächten unter 88 %, erscheint ein Hinweis mit Verweis auf ärztliche Abklärung (Schlafapnoe). Sonst keine Zeile.

## 5. Was der Coach daraus macht
Die Erklärkarte „Wie kann ich meinen Schlaf verbessern?“ bekommt die Bausteine mit (nur Zahlen, keine Tagebuchtexte). So kann der Coach gezielt auf den schwächsten Baustein eingehen, z. B. Regelmäßigkeit statt allgemeiner Tipps. Gewohnheiten mit Wirkung auf Erholsam (Alkohol, Sauna, Bildschirm, spätes Training) kommen aus der vorhandenen Muster-Auswertung.

## 5a. Nachkalibrierung (25.11.2026)
Erste Fassung war zu großzügig: „im eigenen Bereich“ gab volle Punkte, eine gewöhnliche Nacht lag bei 95–100. Neu:
- **Menge:** Bedarf gedeckt = 85 (der Bedarf ist dein üblicher Schlaf), 10 % mehr = 100, darunter 2 Punkte je Prozentpunkt.
- **Lage im eigenen Bereich** (Tief-/REM-Anteil, Ruhepuls, HRV, Atem): Mitte 80, untere Grenze 60, obere 95, deutlich besser 100.
- **Durchschlafen:** je Aufwachen −10, je Minute wach über 10 min −1,5.
- **Effizienz:** voll ab 98 %, null bei 85 %. **Regelmäßigkeit:** voll bis 10 min, null ab 75 min.
- Ergebnis mit Testnächten: typisch 82 (mittel), sehr gut 97, unruhig 67, kurz 62, schlecht 22.

## 6. Umsetzung
- **Keine Migration nötig.** Alle Werte liegen schon in `garmin_daily`; die Rechnung läuft in der App (`lib/today.ts`: neue Funktion `sleepQuality`, `sleepAchieved` liefert zusätzlich Gesamtwert).
- Oberfläche `[OF]`: `HeuteDetail.tsx` (Schlafseite), `RingRow.tsx` (Ring auf Heute), Readiness-Faktor.
- Daten `[DA]`: nichts, außer der Abruf liefert `awake_count` noch nicht zuverlässig (vor Umsetzung prüfen, wie viele der letzten 30 Nächte gefüllt sind).
- Eins rein, eins raus: Der Satz „x von 3 Werten in deinem Bereich“ und die Legenden-Zeile fallen weg.

## Entscheidungen (25.11.2026)
1. Ring zeigt die Gesamtzahl.
2. Gewichtung Menge zu Erholsam 50 : 50.
3. Readiness nutzt die Gesamtzahl (ab 85 +3, ab 70 ±0, ab 55 −5, darunter −10) statt Garmins Schlafwert.
