# Konzept: Funktionen bündeln, Bereiche gemeinsam nutzen

Stand: 24.11.2026 · Status: **Entwurf, wartet auf Freigabe** · Prompt: `docs/prompt-buendeln.md`

Schon erledigt (PR #130, freigegeben 24.11.): Wochenvorlage entfernt, Training wird im Kalender geplant (kommende Tage) und erfasst (heute und früher, mit Dauer und Anstrengung im Bearbeiten-Bogen). Das ist der erste Teil von Baustein 1 (Tagesblatt) und 7 (Eintragen-Blatt).

Die erste Aufräumrunde (`docs/aufraeumen-vorschlag.md`, 22.11.) hat Seiten und Karten sortiert. Diese zweite Runde geht eine Ebene tiefer: Viele Bereiche bauen dieselbe Sache auf eigene Art. Das kostet Pflege, und gleiche Dinge sehen an verschiedenen Stellen verschieden aus. Ziel sind **sieben gemeinsame Bausteine**, die jeder Bereich mit seinen eigenen Inhalten füllt.

Grundsatz: **Ein Ding, ein Baustein, viele Orte.** Der Bereich entscheidet, *was* drinsteht (Farbe, Voreinstellung, Inhalt), der Baustein entscheidet, *wie* es aussieht und sich bedient.

---

## Befund (Stand 24.11.)

| Was | Heute gebaut in | Problem |
|---|---|---|
| Monatskalender | `training/CalendarSection`, `zyklus/CycleCalendar`, `training/KarateSection`, `tagebuch/MuscleSection` | vier Raster, verschiedene Punkte, Tippen führt jeweils woanders hin |
| Ein Tag im Detail | Heute ‹ ›, Tagesdetail im Trainingskalender, Tagebuch mit Datum, Schild im Verlauf | dieselbe Frage („Was war an diesem Tag?“) hat vier halbe Antworten |
| Wert über die Zeit | `/heute/[wert]` (`HeuteDetail`), `/verlauf?m=` (`VerlaufDetail`), `/gesundheit/gewohnheit` (`HabitDetail`), `BelastungZeitCard` | vier Seitenaufbauten, Zeiträume verschieden (7 T · 30 T · 3 M · 6 M, nur 4 Wochen, „Jahr“) |
| Zusammenhänge (Muster-Motor) | Gesundheit › Weitere Muster, Zyklus › Gewohnheiten je Phase, Gewohnheit-Detail, Verlauf › „Was davor war“, Wadenkrämpfe, Training-Insights | sechs Darstellungen derselben Aussage „Tage mit X folgten oft auf Y“ |
| Einordnung (Wort + Farbe) | Readiness-Stufen, Korridor im/über/unter, Belastungsziel unter/im/über, Zustand Cardio/Muskeln | jede Stelle eigene Wörter und eigene Farbregeln |
| Raster und Rückblick | Trainingstage-Raster, Gewohnheiten im Monat, Monatsrückblick Training, Zyklus-Historie | ähnliche Kästchen-Raster, je eigener Code |
| Eintragen | 16 Stellen mit eigenem Formular (Tagebuch, Training, Gesundheit, Zyklus, Uhr); `EditSheet` nur bei Krank und Verletzt | unterschiedliche Abläufe zum Speichern, Löschen, Nachtragen |

---

## Die sieben Bausteine

### 1. Tagesblatt: ein Tag, alles darin
Eine Ansicht pro Tag. Sie öffnet sich von überall, wo ein Datum steht: Kalender, Heute ‹ ›, Punkt in einem Diagramm, Rückblick.

Inhalt, von oben nach unten (nur was es gibt):
1. Datum, Zyklustag und Phase
2. Kernwerte des Tages: Readiness, Schlaf, Belastung, Stress (als kleine Kacheln, Tipp öffnet die Wert-Seite)
3. Training: geplant, erledigt, von Garmin, mit „+ Sport“ zum **Planen** (kommende Tage) oder **Erfassen** (heute und früher, mit Dauer und Anstrengung)
4. Tagebuch: Blutung, Symptome, Gewohnheiten, Medikamente, kurz zusammengefasst, mit „Bearbeiten ›“
5. Besonderes: Krankheit, Verletzung, Wadenkrampf, Hitzewallungen

Das **Tagebuch bleibt das Zuhause zum Eintragen** (CLAUDE.md, Aufräumrunde 1). Das Tagesblatt zeigt den Tag und springt zum Bearbeiten ins Tagebuch mit diesem Datum. Ausnahme Training: Planen und Erfassen geht direkt im Tagesblatt. Das erfüllt auch den Wunsch „Erfassung über den Kalender“ (Wochenvorlage fällt weg).

Auf dem iPhone als Blatt von unten, am Computer in der rechten Spalte neben dem Kalender.

### 2. Ein Kalender mit Ebenen
Ein Monatsraster für die ganze App. Ebenen lassen sich zuschalten:
- **Training** (Punkte je Sportart, geplant hohl, erledigt voll)
- **Zyklus** (Phasen als Hintergrund, Periode markiert)
- **Symptome** (Amber-Punkt)
- **Gewohnheiten** (eine gewählte Gewohnheit als kleiner Strich)

Jeder Bereich öffnet ihn mit seiner Voreinstellung: Training mit Training + Zyklus, Zyklus mit Zyklus + Symptome, Tagebuch mit allem. Karate (Prüfungen) und Wadenkrämpfe werden Ebenen statt eigener Raster. Tippen auf einen Tag öffnet immer das Tagesblatt.

### 3. Eine Wert-Seite
Jeder Wert (HRV, Ruhepuls, Schlaf, Stress, Belastung, Cardio, Muskeln, eine Gewohnheit, Gewicht) bekommt dieselbe Seite:
1. Kopf: große Zahl, Ring oder Bogen, Einordnung (Baustein 5)
2. Ein Satz, der das Ergebnis nennt
3. Diagramm mit Band und **einem** Zeitraum-Umschalter für die ganze App: **7 T · 30 T · 3 M · 6 M · 1 J**
4. Dein Bereich (Anteil im Bereich, Serie, Erholungszeit, Verschiebung)
5. Nach Zyklusphase
6. Zusammenhänge (Baustein 4)
7. Erklärkarte mit „Mehr dazu im Coach“

`/heute/[wert]`, `/verlauf?m=…` und `/gesundheit/gewohnheit` werden eine Seite `/wert/[name]`. Alte Adressen leiten weiter. Was ein Wert nicht hat (z. B. keine Zyklusphase bei Gewohnheiten ohne Zyklusbezug), fällt weg, die Reihenfolge bleibt.

### 4. Zusammenhänge
Ein Baustein für alles, was der Muster-Motor findet. Immer gleich:
- ein Satz („Nach Tagen mit Sauna lag deine HRV meist höher.“)
- die Belegzahl („an 9 von 12 Tagen“)
- ein Hinweis, wie sicher es ist (vorläufig / deutlich)
- immer als Zusammenhang, nie als Ursache, keine Diagnose

Genutzt auf der Wert-Seite, in Gesundheit › Weitere Muster, Zyklus › Gewohnheiten je Phase, Wadenkrämpfe und Training-Insights.

### 5. Einordnung
Eine Funktion und ein Baustein für „Wo stehe ich?“: liefert **Wort, Farbton, Satz**.
- Bereich: unter · im · über deinem Bereich
- Ziel: unter · im · über dem Ziel
- Zustand: Kalibrieren · Abbau · Optimal · Müde · Steigt schnell
- Readiness-Stufen

Regeln aus CLAUDE.md gelten an einer Stelle: Farbe nie allein, keine Ampel für Erholung, „mehr ist heller“ innerhalb der Familie, Amber nur als Hinweis.

### 6. Raster und Rückblick
Ein Kästchen-Raster (Tage × Wochen) für Trainingstage, Gewohnheiten, Symptome und Zyklus-Historie, mit Serie und Bestwert. Dazu **ein Monatsrückblick** als gemeinsamer Aufbau: Jeder Bereich zeigt seinen Teil (Training: Einheiten und Belastung, Gesundheit: Gewohnheiten, Zyklus: Länge und Symptome). Auf Gesundheit › Überblick steht der ganze Monat zusammen.

### 7. Eintragen-Blatt
Ein Ablauf für jedes Formular: Blatt von unten, Titel, Tipp-Felder zuerst, Details nur wo nötig, unten „Speichern“, bei bestehenden Einträgen „Löschen“, Datum oben änderbar (Nachtragen). Gilt für Training erfassen, Krank, Verletzt, Körper, Wadenkrampf, Periode nachtragen, Medikament anlegen. `components/ui/EditSheet` ist die Grundlage.

---

## Was sich dadurch ändert

| Vorher | Nachher | Was du sparst |
|---|---|---|
| 4 Kalender, jeder anders | 1 Kalender mit Ebenen | gleiche Bedienung überall, ein Blick zeigt Training und Zyklus |
| „Was war an dem Tag?“ an vier Stellen halb | Tagesblatt von überall | Suchen entfällt |
| Wochenvorlage | Planen und Erfassen im Tagesblatt | keine Pflege einer Vorlage |
| 4 Detailseiten, verschiedene Zeiträume | 1 Wert-Seite, 1 Zeitraum-Umschalter | jede Seite liest sich gleich |
| 6 Darstellungen der Muster | 1 Baustein Zusammenhänge | Aussagen sind vergleichbar |
| Wörter und Farben je Stelle | 1 Einordnung | keine Widersprüche zwischen Seiten |
| 16 eigene Formulare | 1 Eintragen-Blatt | Speichern, Löschen, Nachtragen immer gleich |

## Bewusst nicht geändert
- Navigation mit fünf Bereichen, Coach als schwebender Knopf, Seitenleiste am Computer
- Heute als ruhige Einstiegsseite (Rondell, Auf einen Blick, Heute steht an, Letzte Aktivitäten)
- Tagebuch als Zuhause fürs Eintragen
- Farbfamilien, Ringe, Seitenköpfe, Begriffe
- Keine Funktion fällt weg, ohne dass du zustimmst

## Reihenfolge (je ein Pull Request)
1. ✅ **Einordnung** und **Zeitraum-Umschalter** (PR #133): `lib/einordnung.ts`, `lib/zeitraum.ts`, `components/ui/SpanSwitch.tsx`
2. ✅ **Eintragen-Blatt** (PR #134): `EditSheet` mit Variante „Fertig“ (sofort speichern); Medikamente (ein Blatt für Anlegen und Ändern), Körper-Einträge, Wadenkrampf, Training erfassen. Fotos: `docs/bilder/buendeln-eintragen/`
3. ✅ **Tagesblatt** (PR #135): `components/tag/Tagesblatt.tsx` und `TagTraining.tsx`. Trainingskalender (am Computer daneben) und Zyklus-Kalender (Tipp öffnet es im Blatt). Fotos: `docs/bilder/buendeln-tagesblatt/`
4. **Kalender mit Ebenen** (ersetzt die vier Raster)
5. **Wert-Seite** (`/wert/[name]`, Weiterleitungen)
6. **Zusammenhänge**
7. **Raster und Rückblick**

## Entscheidungen und offene Punkte
- Wert-Seite unter neuer Adresse `/wert/…`, alte Adressen leiten weiter (Nutzerin 24.11.)
- Reihenfolge der Bausteine wie oben (Nutzerin 24.11.)
- Vorschlag, wartet auf Zustimmung: Das Tagesblatt zeigt Tagebuch-Einträge, „Bearbeiten ›“ öffnet das Tagebuch mit dem Datum. Training wird direkt im Tagesblatt geplant und erfasst.
- Vorschlag, wartet auf Zustimmung: Rückblick als Abschnitt „Dieser Monat“ auf jeder Wert-Seite (Vergleich mit Vormonat). Dazu auf Gesundheit › Überblick „Dein Monat“: nur deutlich veränderte Werte, je ein Satz mit Link. Monatsrückblick Training und „Gewohnheiten im Monat“ gehen darin auf, keine eigene Seite.
