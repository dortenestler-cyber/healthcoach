# Konzept: Belastung über die Zeit (Cardio und Muskeln)

Stand: 24.11.2026 · Status: **Freigegeben (24.11.)** · umgesetzt in PR #129 · Vorbild: Bevel „Cardio-Belastung“ und „Muskelbelastung“

Die Karte ersetzt „Last und Korridor“ auf Training › Auswertung (`components/training/BelastungZeitCard.tsx`, Rechnung `lib/belastungZeit.ts`).

## Werte
- **Cardio:** Schnitt der Tagesbelastung der letzten 7 Tage in % (abflachende Skala, `docs/konzept-belastung-skala.md`). Folgt dem Umschalter „Mit Alltag · Nur Training“.
- **Muskeln:** Schnitt der Muskelpunkte der letzten 7 Tage. Startwerte:
  - Einheit Kettlebell, Bouldern: Minuten × Anstrengung (1–10) ÷ 10. Karate zählt halb.
  - Ohne eingetragene Anstrengung gilt 5 (steht dann unter der Karte).
  - Kettlebell-Sätze: Wiederholungen × kg ÷ 40, Körpergewicht zählt wie 8 kg. Hat die Kettlebell-Einheit des Tages eine Anstrengung, zählt die Einheit statt der Sätze (nichts doppelt).
- **Optimaler Bereich:** 80–130 % des Tagesschnitts der 4 Wochen vor den 7 Tagen. Wandert mit.

## Zustände (Nutzerin 24.11.)
| Zustand | Wann | Darstellung |
|---|---|---|
| Kalibrieren | weniger als 5 Wochen Daten | grau, Leiste unter dem Diagramm grau |
| Abbau | unter dem Bereich | Slate-Blau dunkel |
| Optimal | im Bereich | Slate-Blau |
| Müde (nur Cardio) | nicht unter dem Bereich, HRV unter oder Ruhepuls über deinem Bereich an diesem und dem Tag davor | Slate-Blau hell, gefüllter Punkt |
| Steigt schnell | über dem Bereich | Amber (Hinweis) |

Punkte sind Kreise mit Wort in Legende und Schild beim Antippen, nie nur Farbe. Muskeln haben kein „Müde“, dafür „Letzte Kraft-Einheit vor … Tagen“.

## Aufbau der Karte
Satz mit Ergebnis · Umschalter Cardio · Muskeln · große Zahl mit Zustand und optimalem Bereich · Diagramm (Band, Linie, Punkte, Leiste) · Zeiträume 7 T · 30 T · 3 M · 6 M (die App lädt 180 Tage) · Legende · „So verteilt sich der Zeitraum“.

Der Coach bekommt Wert, Zustand und Bereich für beide.
