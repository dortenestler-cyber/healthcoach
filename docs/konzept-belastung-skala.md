# Konzept: Belastung wie bei Bevel

Stand: 24.11.2026 · Status: **Freigegeben (24.11.)** · umgesetzt in PR #127

Anlass: Bevel zeigte 11 % Belastung, Health Coach 0 % bei 5.832 Schritten außerhalb von Training.

## 1. Leichte Bewegung zählt mit
- Bisher zählte eine Minute im Alltag erst ab Zone 1 (30 % zwischen Ruhepuls und Maximalpuls, etwa 92 Schläge).
- Neu: Stufe **leicht** ab 20 % (etwa 80 Schläge), mit halbem Gewicht (0,5 Punkte pro Minute).
- Wie bei Zone 1 gilt: nur in Abschnitten, in denen der Puls mindestens 10 Minuten am Stück im leichten Bereich oder darüber liegt. Kurze Spitzen im Sitzen zählen nicht.
- `garmin-sync/alltag.ts` (`LIGHT_LIMIT`, `LIGHT_WEIGHT`), Rechenweise Version 3. Die letzten 90 Tage werden beim Abrufen nach und nach neu gerechnet (21 Tage je Abruf).

## 2. Skala flacht nach oben ab
- Prozent = 100 × ln(1 + Last ÷ 100) ÷ ln(2,5). 150 Garmin-Last bleibt 100 %, darüber geht es langsam weiter.
- 25 Last ≈ 24 %, 50 ≈ 44 %, 75 ≈ 61 %, 150 = 100 %, 225 ≈ 129 %, 300 ≈ 151 %.
- Der Tageswert kommt aus der Gesamtlast, Training und Alltag teilen ihn nach ihrem Anteil. Werte einzelner Einheiten addieren sich deshalb nicht.
- Ring und Bogen sind ab 100 % voll. Sehr kleine Werte heißen „unter 1 %“.
- Grenzen bleiben bei derselben Last: harter Tag ab 105 Last (78 %), mittlerer Tag ab 60 Last (51 %).
- `lib/alltagslast.ts` `loadToPct`, gleich in `supabase/functions/watch/target.ts`.

## 3. Persönliches Belastungsziel
- Übliche Belastung: Schnitt der Tagesbelastung der letzten 28 Tage, ohne heute und ohne kranke Tage, ab 14 Tagen.
- Mitte = übliche Belastung × Faktor aus der Readiness: ab 85 × 1,15 · 65–84 × 1,0 · 45–64 × 0,75 · darunter × 0,5.
- Bereich: Mitte ± 10, mindestens 20 breit, Grenzen 10 bis 140 %. Pause bei Krankheit bleibt 0–15 %.
- Bremse: Last der letzten 7 Tage über 130 % der 4 Wochen davor, dann nicht über der üblichen Belastung.
- Unter 14 Tagen Daten gelten die festen Stufen.
- `lib/insights.ts` `usualLoad`, `targetBand`; Uhr: `watch/target.ts`.
