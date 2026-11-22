# Konzept: Lebendige Korridore und Belastung aus dem Alltag

Stand: 22.11.2026 · Status: **Freigegeben (22.11.)** · Schritt 1 umgesetzt (PR #60) · Schritt 2 B Daten in PR #63

Zwei Wünsche der Nutzerin:
1. Die persönlichen Korridore (in der App „dein Bereich“) sollen mehr Inhalt bekommen und dynamischer werden.
2. Die tägliche Belastung soll nicht nur aus Trainings kommen, sondern auch aus dem Alltag.

---

## Teil A · Persönliche Korridore

### Wie es heute ist
- `lib/baseline.ts`: Bereich = mittlere Hälfte der letzten 30 Tage ohne heute, ab 14 Tagen Daten.
- Nur für HRV, Ruhepuls und Temperatur gibt es in der Lutealphase einen eigenen Bereich.
- In den Diagrammen (`VerlaufView`, `HrvCard`, `LineBand`) ist der Bereich **ein festes Band** über den ganzen Zeitraum. Er zeigt nur, wo der Bereich heute liegt.
- Die Karte sagt nur „im Bereich“, „über“ oder „unter“.
- Trainingslast hat einen eigenen Korridor (80–130 % der 4 Wochen davor), der in `LoadTrendCard` schon mitwandert.

Ergebnis: Der Bereich ist eine Zahl ohne Geschichte. Man sieht nicht, ob er sich verschiebt, warum ein Wert herausfällt oder wie schnell er zurückkommt.

### A1 · Der Korridor wandert mit (dynamisch)
**Wandernder Korridor im Verlauf.** Für jeden Tag im Diagramm wird der Bereich so berechnet, wie er an diesem Tag galt (30 Tage davor). Das Band folgt der Linie, wie heute schon bei der Trainingslast. Im Halbjahr und Jahr als Wochenmittel.
- Satz dazu, z. B. „Dein HRV-Bereich ist seit August um 6 ms gestiegen.“
- Auf Wunsch umschaltbar: „Bereich heute“ (wie bisher) · „Bereich über die Zeit“.

**Korridor je Zyklusphase, für alle Phasen.** Heute gibt es nur Luteal gegen Rest. Neu: vier Bereiche (Menstruation, Follikel, Eisprung, Luteal) aus den letzten etwa vier Zyklen, sobald je Phase genug Tage da sind (Vorschlag: 10). Gilt für HRV, Ruhepuls, Temperatur, Atemfrequenz und Schlaf. Die Werte werden an dem Bereich ihrer Phase gemessen. Im Diagramm wechselt das Band mit der getönten Phase.
- In der Perimenopause werden Zyklen unregelmäßig. Fehlt die Phase, gilt der 30-Tage-Bereich. Das steht dann dabei.

**Kranke Tage zählen nicht.** Tage mit eingetragener Krankheit oder Verletzung (und 3 Tage danach) fließen nicht in den Bereich ein. Sonst verschiebt eine Erkältung den Bereich für einen Monat.

**Wie sicher ist der Bereich?** Statt hart „ab 14 Tagen“: Unter 14 Tagen „vorläufig“, ab 30 Tagen „stabil“. Ein Wort an der Bereichszeile, kein zusätzliches Symbol.

### A2 · Mehr Inhalt je Korridor
Auf der Detailseite (`/verlauf?m=…`) kommt unter das Diagramm ein Abschnitt **„Dein Bereich“** mit kurzen Zeilen. Jede Zeile nur, wenn genug Daten da sind.

| Inhalt | Beispiel |
|---|---|
| **So oft im Bereich** | „In den letzten 30 Tagen lag deine HRV an 21 Tagen im Bereich, an 6 darunter.“ |
| **Serie** | „Seit 5 Tagen im Bereich.“ oder „Seit 3 Tagen darunter.“ |
| **Schnell zurück?** | „Nach einem Tag unter dem Bereich warst du meist nach 2 Tagen zurück.“ (Erholungszeit, Median) |
| **Verschiebung** | „Dein Bereich liegt höher als vor 3 Monaten (48–61 statt 44–57 ms).“ |
| **Breite** | „Dein Ruhepuls ist sehr gleichmäßig.“ oder „schwankt mehr als sonst.“ |
| **Was davor war** | „Tage unter dem Bereich folgten oft auf: Alkohol (4 von 6), harte Einheit (3 von 6).“ Aus dem vorhandenen Muster-Motor (`lib/muster.ts`, `lib/habitStats.ts`), nur als Zusammenhang, keine Ursache. |
| **Wochentag** | „Am Wochenende liegt dein Schlaf eher über dem Bereich.“ (wie `usualWeekday` bei Stress) |
| **Nach Zyklusphase** | Vier kurze Bereiche nebeneinander (gibt es als `PhaseCompare`, wird um die Bereiche je Phase ergänzt). |

Jede Zeile ist ein Satz, keine Tabelle. Ganz unten „Frag den Coach“ mit den Zahlen als Frage (wie `ExplainCard`).

### A3 · Korridore für weitere Werte
Neu dazu, alle mit derselben Berechnung:
- **Tagesbelastung** (siehe Teil B): eigener Bereich, nicht nur das Ziel aus der Readiness
- **Alltagsschritte** (Schritte außerhalb von Trainings)
- **Tiefschlaf** und **REM** in Minuten
- **Schlafbeginn** (Regelmäßigkeit: „Du schläfst meist zwischen 22:40 und 23:20 ein.“)
- **Body Battery aufgeladen** über Nacht (`bb_charged`, wird schon abgerufen)
- **Zeit mit hohem Stress** (`stress_high_s`)

### A4 · Auf Heute
Die Zeile „4 von 5 Werten in deinem Bereich“ bleibt. Neu: Fällt ein Wert seit mindestens 3 Tagen heraus, steht das als ein Satz darunter („Ruhepuls seit 3 Tagen über deinem Bereich“). Bei Ruhepuls dauerhaft über dem Bereich plus Krankheitszeichen bleibt es beim Hinweis auf ärztliche Abklärung, keine Deutung.

---

## Teil B · Tägliche Belastung auch aus dem Alltag

### Wie es heute ist
`loadPercent` in `lib/insights.ts`: 100 % ≈ harter Trainingstag. Gezählt wird das Größere von
- Intensitätsminuten ÷ 60 und
- Trainingsbelastung der Garmin-Aktivitäten ÷ 150.

Gartenarbeit, Treppen, Einkaufen tragen, lange Wege zu Fuß zählen nur, wenn sie Intensitätsminuten bringen. Ein Tag mit 18.000 Schritten ohne gestartete Aktivität sieht fast aus wie ein Ruhetag. Wochenlast und Belastungsverhältnis rechnen sogar nur mit Aktivitäten.

### Vorschlag: Tagesbelastung = Training + Alltag
Die Belastung wird aus dem **Puls über den ganzen Tag** berechnet, so wie Whoop und Bevel es machen. Der Puls merkt jede Anstrengung, egal ob sie als Training gestartet wurde.

**1. Pulsminuten in Zonen.** Garmin liefert den Tagespuls alle 2 Minuten. Jede Minute bekommt ein Gewicht nach ihrer Pulszone (Anteil zwischen Ruhepuls und Maximalpuls):

| Zone | Anteil | Gewicht pro Minute |
|---|---|---|
| Ruhe | unter 30 % | 0 |
| 1 locker | 30–50 % | 1 |
| 2 zügig | 50–60 % | 2 |
| 3 mittel | 60–70 % | 3 |
| 4 hart | 70–80 % | 4 |
| 5 sehr hart | über 80 % | 5 |

Ruhepuls kommt aus Garmin, Maximalpuls aus den Aktivitäten (höchster Wert der letzten 12 Monate) oder als Startwert. Die Grenzen sind Startwerte und in Einstellungen einsehbar.

**2. Aufteilen in Training und Alltag.** Minuten, die in eine Garmin-Aktivität fallen, zählen als **Training**, alle anderen als **Alltag**. So wird nichts doppelt gezählt.

**3. Gleiche Einheit wie bisher.** Für Trainings bleibt die Garmin-Trainingsbelastung maßgeblich (bekannt, auf der Uhr sichtbar). Die App lernt aus den eigenen Trainings, wie viele Pulspunkte einem Punkt Garmin-Last entsprechen (persönlicher Umrechnungsfaktor, Median der letzten 30 Trainings). Mit diesem Faktor wird der Alltag in dieselbe Einheit umgerechnet.
- Tageslast = Garmin-Last der Trainings + umgerechnete Alltagslast
- Belastung in % = Tageslast ÷ 150, wie bisher bis 100 %

**4. Rückfall ohne Pulsdaten.** Fehlt der Tagespuls (Uhr nicht getragen), schätzt die App den Alltag aus Schritten außerhalb von Aktivitäten und Intensitätsminuten. Das steht dann als „geschätzt aus Schritten“ dabei.

**5. Was nicht zählt.** Stress hebt den Puls auch ohne Bewegung. Damit eine stressige Besprechung nicht als Training zählt, zählen im Alltag nur Minuten ab Zone 1, in denen Garmin auch Bewegung misst (Schritte in diesem Abschnitt). Stress bleibt eine eigene Größe in Türkis.

### Wo es zu sehen ist
- **Ring Belastung auf Heute**: ein Bogen, innen zwei Anteile in Slate-Blau, Training kräftig, Alltag hell (Ausdauer-Ton aus der Familie). Darunter in Worten: „62 % · davon Alltag 24 %“.
- **Karte Belastung heute** (`LoadCard`): neue Kachel „Alltag“ mit Minuten in Bewegung und Schritten außerhalb von Training. Satz wie „Heute kam ein Drittel deiner Belastung aus dem Alltag.“
- **Training › Wochenlast, Belastungsverhältnis, Last und Korridor**: rechnen standardmäßig mit der vollen Tageslast. Umschalter „Nur Training“ für den Vergleich mit Garmin. Säulen je Tag zweiteilig (Training · Alltag).
- **Belastungsziel und Schlafbedarf**: nutzen die volle Tageslast. Ein langer Gartentag erhöht also den Schlafbedarf.
- **Coach**: bekommt Training und Alltag getrennt als zwei Zahlen.

### Übergang
Nach der Umstellung liegen Werte höher als bisher. Damit der Korridor nicht springt, berechnet die App beim ersten Abruf die Alltagslast für die letzten 90 Tage nach (soweit Garmin Pulsdaten hat). Ein Hinweis erklärt einmalig: „Ab heute zählt auch Bewegung im Alltag. Deine Werte sind deshalb etwas höher.“

---

## Umsetzung nach Rollen

### Daten `[DA]`
1. Migration: in `garmin_daily` neue Spalten
   - `hr_curve smallint[]` (Puls alle 15 Minuten, 96 Werte, für die Anzeige)
   - `load_daily_min jsonb` (Minuten je Zone, getrennt nach Training und Alltag)
   - `active_kcal int`, `active_s int`, `highly_active_s int` aus der Tageszusammenfassung (Garmin liefert sie schon mit)
   - `steps_outside_acts int`
2. `garmin-sync`: Tagespuls je Tag abrufen (`/wellness-service/wellness/dailyHeartRate`), Zonenminuten berechnen, Aktivitätszeiten abziehen, speichern. Rohdaten alle 2 Minuten werden nicht gespeichert.
3. Nachberechnung für 90 Tage in Stücken, wie beim Laden eines Jahres.
4. Uhr (`watch/`): Belastungsring mit neuer Tageslast, später.

### Gemeinsam `lib/`
- `lib/baseline.ts`: wandernder Bereich (`rangeSeries`), Bereiche je Zyklusphase, kranke Tage ausschließen, „vorläufig/stabil“.
- Neu `lib/korridor.ts`: Inhalte aus A2 (Anteil im Bereich, Serie, Erholungszeit, Verschiebung, Breite, Wochentag, was davor war).
- `lib/insights.ts` `loadPercent` und `lib/today.ts` `loadByDay`: Tageslast aus Training + Alltag, Umrechnungsfaktor, Rückfall auf Schritte.

### Oberfläche `[OF]`
- `LineBand` und `VerlaufDetail`: Band je Tag statt festem Band, Abschnitt „Dein Bereich“.
- `ValueRing`/`TodayRings`, `LoadCard`, `WeekLoadView`, `LoadTrendCard`, `RatioCard`: Training und Alltag getrennt.
- Neue Detailseiten für die Werte aus A3.

### Reihenfolge (Vorschlag)
1. ✅ **A1 + A2** (nur `lib/` und Oberfläche, keine Migration): wandernder Korridor, Phasen-Bereiche, kranke Tage raus, Abschnitt „Dein Bereich“. Verletzungen nehmen wir nicht heraus: sie dauern oft Wochen bei normalen Werten.
2. **B Daten** (PR #63): Migration und `garmin-sync` (braucht deine Freigabe, du mergst selbst). Aufbau der Werte: `lib/alltagslast.ts`.
3. **B Anzeige**: Ring, Karten, Wochenlast mit Alltag.
4. **A3**: Korridore für weitere Werte, inklusive Tagesbelastung.

---

## Entscheidungen (22.11.2026)
1. Alltag ist **Teil des Belastungsrings**: ein Ring, Training kräftig, Alltag hell.
2. Wochenlast und Belastungsverhältnis rechnen **standardmäßig mit Alltag**, Umschalter „Nur Training“.
3. Eigene Korridore für **alle vier Zyklusphasen**.
4. **Kranke Tage** (und 3 Tage danach) zählen nicht zum Korridor.
5. **Kein Tippfeld** „anstrengender Tag“ im Tagebuch.
6. **Alle** neuen Korridore aus A3 kommen.
