# Konzept: Insights zu Trainingseinheiten

Stand: 23.11.2026 · Status: **Vorschlag, wartet auf Freigabe** · Ansicht: `docs/entwurf-training-insights.html` (alle Zahlen dort sind Beispieldaten)

## Was die Nutzerin will
Zu jeder Trainingseinheit und über Wochen verstehen: Wie hart war es, wie hat der Körper reagiert, und was hilft oder bremst.

## Was schon da ist (keine neue Datenquelle nötig)
- `garmin_activities`: Sportart, Dauer, Puls Ø und max, Garmin-Belastung, Distanz, Schritte, Pulspunkte.
- `garmin_daily`: HRV, Ruhepuls, Schlaf, Readiness, Energie.
- Zyklusphase und Tagebuch (Symptome, Gewohnheiten).
- Bausteine: `lib/training.ts` (Sportarten), `lib/insights.ts` (Muster, Belastung), `components/charts`, Karten in `components/training`.

## Drei Ebenen

### 1 · Einheit (Tipp auf eine Aktivität)
Neue Detailseite `/training/einheit/…`, Kopf in Training-Blau.
- **Ein Satz zum Ergebnis**, z. B. „Etwas härter als deine letzten Karate-Einheiten.“
- **Kacheln**: Dauer, Puls Ø, Puls max, Belastung.
- **Vergleich mit dir**: jede Kachel gegen den Schnitt der letzten 5 Einheiten derselben Sportart („+8 Schläge“, „länger als üblich“). Kein Vergleich mit anderen Menschen.
- **Zeit in Pulszonen** (Stufe 2): ein Balken, mehr Zone = heller.
- **Zeitstrahl der Einheit** (Stufe 2): Puls je 5 Minuten als Balken in Zonenfarbe, dazu eine Linie, wie sich die Belastung über die Einheit aufbaut, mit Satz zum härtesten Abschnitt. Tipp auf eine Stelle zeigt Uhrzeit, Puls und bisherige Belastung. Die Belastung je Abschnitt ist eine Schätzung aus den Pulszonen, die Garmin-Zahl am Ende bleibt maßgeblich.
- **Danach**: HRV und Ruhepuls am nächsten Morgen, Schlafdauer der Nacht, Readiness, jeweils gegen deinen Bereich. Sage-Familie.
- **Kontext**: Zyklustag und Phase (geschätzt), Symptome des Tages aus dem Tagebuch.

### 2 · Sportart (Karate, Kettlebell, Bouldern, Ausdauer)
Unter Training eine Karte „Insights“, je Sportart eine Seite:
- Belastung und Puls Ø der letzten 8–12 Einheiten als Balken mit Linie.
- Häufigkeit pro Woche und Dauer im Verlauf.
- Überschrift mit Ergebnissatz, wie überall in der App.

### 3 · Muster über alle Einheiten
Erscheinen in „Weitere Muster“ unter Gesundheit und als Karte unter Training. Erst ab 5 Einheiten je Gruppe, mit Angabe der Basis („aus 7 Einheiten“):
- HRV am nächsten Morgen nach Sportart.
- Puls bei gleicher Sportart je Zyklusphase.
- Schlaf nach Abendtraining (nach 20 Uhr) gegen früheres Training.
- Wie viele Ruhetage zwischen harten Einheiten vorkommen und wie die Readiness danach aussieht.

Texte beschreiben nur, was zusammen vorkommt, nie Ursache. Keine Diagnosen, keine Trainingsvorgaben, bei Warnzeichen Hinweis auf ärztliche Abklärung.

## Umsetzung in Schritten
| Schritt | Rolle | Inhalt | Datenbank |
|---|---|---|---|
| 1 | OF | `lib/trainingInsights.ts`, Einheit-Seite, Vergleich, „Danach“, Sportart-Seiten | keine |
| 2 | DA | Pulsverlauf je Einheit (ein Wert je 5 Minuten) und Zeit in Pulszonen aus Garmin holen und speichern (`hr_series`, `hr_zones`) | **Migration, Freigabe nötig** |
| 3 | OF | Muster-Karten, Einstieg von Training und Gesundheit | keine |
| 4 | OF | Einheit-Kennzahlen in den Coach-Kontext (nur Zahlen, keine Rohdaten) | keine |
| optional | DA/OF | „Wie fühlte es sich an?“ 1–10 nach der Einheit, Tipp im Tagebuch | **Migration** |

Schritt 1 und 3 brauchen keine Migration und könnten sofort nach Freigabe starten. Eigene Zweige und Entwurfs-PRs mit Kürzel, wie in `CLAUDE.md`.

## Entscheidungen, die ich von dir brauche
1. Einstieg: Tipp auf die Aktivität in der Tagesliste (Training) und zusätzlich Karte „Insights“ auf Training. Passt das?
2. Pulszonen (Schritt 2) mit Migration: ja oder erst später?
3. Eigene Anstrengung 1–10 nach der Einheit: ja oder nein? Die Vorschlag-Karte nennt schon „Anstrengung (1–10)“, ein Vergleich Gefühl gegen Garmin-Belastung wäre dann möglich.
4. Mindestanzahl für Muster: 5 Einheiten je Gruppe in Ordnung?
