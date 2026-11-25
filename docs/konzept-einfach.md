# Konzept: Einfach bedienen (dritte Runde)

Stand: 25. Nov. 2026 · Entwurf, wartet auf Freigabe · Rolle Oberfläche `[OF]`
Prompt: `docs/prompt-einfach.md` · Skizze: `docs/entwurf-einfach.html` · Fotos: `docs/bilder/einfach/`

Vorab entschieden (Logbuch 25.11.): Der zentrale Kalender öffnet sich über das Datum auf Heute und über ein Kalender-Symbol im Kopf jedes Bereichs, mit passender Ebene vorgewählt. Kein sechster Navigationspunkt. Pillen merken ihren Zustand.

---

## 1 Prüfung

Gemessen am 25.11. mit **Beispieldaten** (400 Tage Garmin, 120 Tage Tagebuch, 200 Tage Training) auf 390 × 844. Eine Bildschirmhöhe = 844 px.

### 1.1 Seiten im Überblick

| Seite | Länge | Karten | Wichtigstes auf dem ersten Bildschirm? | Auffällig |
|---|---|---|---|---|
| Heute | 2,0 | 2 + Rondell | ja | „Alle ›“ bei Letzte Aktivitäten führt auf Training › Kalender, dort gibt es keine Liste |
| Tagebuch | 2,8 | 9 | ja | Zwei Arten zu speichern (Knopf „Speichern“ in der Mitte, darunter Teile, die sofort speichern). Hinweise wie „Speichert sofort, unabhängig vom Knopf unten“ stehen zweimal. Datum als Formularfeld. Ganz unten „Verlauf, 4 Wochen“ als eigenes Raster |
| Training › Kalender | 3,4 | 3 | **nein** | Status-Block (gut 1 Bildschirm) steht über allen sechs Reitern. Der Kalender beginnt erst bei 1,1 Bildschirmhöhen. Das Tagesblatt darunter wiederholt die sechs Werte aus „Auf einen Blick“ |
| Training › Auswertung | 5,7 | 8 | nein | Längste Trainingsseite. Belastung heute, Ziel, Gründe, Empfehlung je Sportart, 14 Tage, Belastung über die Zeit, Wochenkorridor, Trainingstage, alles offen |
| Training › Insights | 3,3 | 3 | nein | Eigener Reiter, inhaltlich Teil der Auswertung |
| Training › Kettlebell · Bouldern · Karate | 1,7 · 2,0 · 3,7 | 2–4 | nein | Sechs Reiter in einer Zeile, „Karate“ ist am Rand abgeschnitten. Jeder Reiter beginnt erst unter dem Status-Block |
| Zyklus | **6,7** | 10 | ja (Ring) | Längste Seite der App. Kalender bei 0,9 Bildschirmhöhen. „Vergangene Perioden nachtragen“ steht zweimal (Link und Formular). Vergleich der Gewohnheiten je Phase ist allein 1,5 Bildschirme lang |
| Gesundheit › Überblick | 3,8 | 5 | ja | „Weitere Muster“: sieben Diagramme untereinander, jedes mit Grundlage-Satz, alles offen |
| Gesundheit › Medikamente · Krank & verletzt · Körper | 1,1 · 2,5 · 2,0 | 3–5 | ja | in Ordnung |
| Detailseiten `/heute/…` | 1,1–4,4 | 1–9 | ja | Schlaf 4,4 (Kurven, Bereich, Phasen, Monat). Aufbau gut, nur lang |
| Einstellungen | 1,8 | 6 | ja | in Ordnung |

Tiefe: Fast alles liegt höchstens zwei Tipps weit weg. Das Problem ist das **Scrollen**, nicht das Tippen: Vieles liegt drei bis sechs Bildschirme tief auf einer Seite.

### 1.2 Kalender und Datumsauswahl in der App

| Stelle | Was | Wo auf der Seite | Unterschied |
|---|---|---|---|
| Training › Kalender (`CalendarSection` → `Monatskalender`) | Monat, Ebenen Zyklus · Training · Symptome, Tagesblatt darunter | ab 1,1 Bildschirmhöhen | alle Ebenen an, Planen und Erfassen |
| Zyklus (`CycleCalendar` → `Monatskalender`) | gleicher Monat, Zyklus und Symptome an | ab 0,9 | Tagesblatt im Blatt, „Periode eintragen“ |
| Zyklus › Perioden nachtragen (`PeriodBackfill`) | Datumsfeld, Dauer, Stärke | ganz unten (6 Bildschirme) | eigenes Formular, doppelt verlinkt |
| Tagebuch (`TagebuchView`) | Datumsfeld des Browsers mit ‹ › | oben | sieht anders aus als alle anderen Kalender |
| Tagebuch › Verlauf, 4 Wochen (`Raster`) | Symptome × Tage | ganz unten | zeigt dasselbe wie die Ebene Symptome |
| Heute | Datum mit ‹ › | oben | kein Kalender, nur Tag für Tag |
| Karate › Prüfungsdatum | Datumsfeld | im Reiter | ein Formularfeld, kein Kalender (bleibt) |

Der Baustein `Monatskalender` ist schon gebündelt (PR #136). Es fehlt der eine Ort, und er steht an zwei Stellen zu weit unten.

### 1.3 Die 10 größten Hürden

Sortiert danach, wie sehr sie im Alltag stören.

1. **Kein zentraler Kalender.** Zwei Kopien mit verschiedenen Voreinstellungen, beide erst nach etwa einer Bildschirmhöhe. Tagebuch und Perioden haben eigene Datumsfelder. (Fotos `vorher-training_t_kalender`, `vorher-zyklus`)
2. **Keine Liste aller Aktivitäten.** Eine Einheit findet man nur über den Kalendertag oder unter „Letzte Aktivitäten“ (zwei Einträge). „Alle ›“ führt ins Leere. (`vorher-heute`)
3. **Training: Status-Block über jedem Reiter.** Jeder der sechs Reiter beginnt erst nach einer Bildschirmhöhe. Sechs Reiter passen nicht in die Zeile. (`vorher-training_t_kalender`)
4. **Zyklus ist 6,7 Bildschirme lang.** Kalender, zwei Perioden-Einstiege, sieben Auswertungskarten und Gewohnheiten je Phase, alles offen. (`vorher-zyklus`)
5. **Training › Auswertung 5,7 plus Insights 3,3.** Zwei Reiter für eine Frage („Wie läuft mein Training?“), Gründe und Erklärungen immer sichtbar. (`vorher-training_t_auswertung`)
6. **Erklärungen sind immer sichtbar.** „Grundlage: … Ein Zusammenhang, kein Beweis.“ unter jeder Musterkarte, Quellen, Rechenwege (Belastungsverhältnis, WHO-Minuten). Nötig, aber nicht jeden Morgen. (`vorher-gesundheit_t_ueberblick`)
7. **Tagebuch: zwei Speicherwege.** Oben speichert der Knopf, unten speichert jeder Tipp sofort. Zwei Hinweissätze erklären das. (`vorher-tagebuch`)
8. **Doppeltes.** Das Tagesblatt unter dem Trainingskalender wiederholt „Auf einen Blick“. Tagebuch-Verlauf und Kalender-Ebene Symptome zeigen dasselbe. Perioden nachtragen gibt es zweimal.
9. **Uneinheitliche Pillen und Umschalter.** In `globals.css` stehen über 20 Varianten (`chip`, `chip-sm`, `pill`, `pill-sm`, `kp-chip`, `segmented`, `zone-seg`, `card-toggle` …). Gleiches sieht unterschiedlich aus und bedient sich unterschiedlich.
10. **Lange Detailseiten.** `/heute/schlaf` ist 4,4 Bildschirme lang, `/heute/stress` 3,3, mit Kurve, Bereich, Phasenvergleich und Monat untereinander.

---

## 2 Konzept

### A Leitregeln

1. **Eine Seite, eine Frage.** Die Antwort steht auf dem ersten Bildschirm, darunter nur, was sie erklärt.
2. **Höchstens 2,5 Bildschirme je Seite.** Was darüber hinausgeht, wird eingeklappt oder bekommt eine eigene Seite.
3. **Zwei Ebenen:** Bereich › Detail. Keine Reiter in Reitern, kein Kopfblock über Reitern.
4. **Ein Baustein je Aufgabe:** ein Kalender, eine Aktivitätenliste, eine Pille, ein Zeitraum-Umschalter (`SpanSwitch`).
5. **Erst die Aussage, dann der Beweis.** Satz und Zahl sind immer sichtbar. Grundlage, Rechenweg und Quelle kommen hinter eine Pille „Details“ (eingeklappt, gemerkt).
6. **Was bleibt:** fünf Bereiche, Coach-Knopf, Heute als ruhige Seite, Tagebuch als Ort fürs Eintragen, Farbsystem „Nacht“.

### B Zentraler Kalender `/kalender`

**Einstiege**
- Heute: Tipp auf das Datum öffnet den Kalender. ‹ › bleiben fürs Blättern Tag für Tag.
- Kopf jedes Bereichs (`PageHead`): Kalender-Symbol rechts neben dem Zahnrad, 44 px.

| Geöffnet von | Ebenen vorgewählt |
|---|---|
| Heute | zuletzt gewählte |
| Tagebuch | Symptome, Gewohnheiten |
| Training | Training |
| Zyklus | Zyklus, Symptome |
| Gesundheit | Krank & verletzt, Medikamente |

Die Vorwahl gilt für diesen Besuch. Ändert die Nutzerin die Ebenen, merkt sich die App das je Einstieg.

**Aufbau** (Skizze 1)
1. Kopf „Kalender“, Monat mit ‹ › und „Heute“.
2. **Ebenen-Pillen**, eine Zeile zum Wischen: Zyklus · Training · Symptome · Gewohnheiten · Krank & verletzt · Medikamente · Schlaf. Mehrfachauswahl, jede Pille mit Farbpunkt **und** Wort.
3. Monat: Zyklus als Phasenband hinter den Tagen (wie heute). Darunter bis zu drei Zeichen je Tag in der Ebenenfarbe, mehr als „+2“. Formen statt nur Farbe: Training Punkt (voll erledigt, hohl geplant), Symptome Raute, Gewohnheiten Strich, Krank & verletzt Kreuz, Medikament vergessen Ring, Schlaf unter Bedarf ein Halbmond.
4. Legende nur für die eingeschalteten Ebenen, eine Zeile.
5. **Tagesblatt** des gewählten Tages darunter (Handy) oder rechts (Computer, iPad): kurz, ohne „Auf einen Blick“-Raster. Oben ein Satz zum Tag, dann je Ebene eine Zeile, unten „Im Tagebuch bearbeiten ›“ und „Einheit planen“.

**Mehrere Tage auswählen**
- Langes Drücken auf einen Tag, dann Ziehen oder Tippen auf einen zweiten Tag markiert einen Zeitraum.
- Leiste unten: „Periode eintragen“, „Krank von–bis“, „Gewohnheit für diese Tage“, „Vergleichen“ (Durchschnitt der Werte im Zeitraum gegen deinen Bereich).
- Ersetzt das Formular „Vergangene Perioden nachtragen“.

**Was aus den bisherigen Kalendern wird**

| Stelle | Neu |
|---|---|
| Training › Reiter Kalender | entfällt. Auf Training steht oben ein **Wochenstreifen** (7 Tage, geplant/erledigt) mit „Kalender ›“ |
| Zyklus › Monatskalender | entfällt. Der Phasenring bleibt, darunter Wochenstreifen mit Phasenfarbe und „Kalender ›“ |
| Zyklus › Perioden nachtragen (beide) | Kalender, Zeitraum auswählen, „Periode eintragen“ |
| Tagebuch › Datumsfeld | Tipp aufs Datum öffnet denselben Monat als Blatt (`DayPick` nutzt `Monatskalender`) |
| Tagebuch › Verlauf, 4 Wochen | entfällt, Link „Im Kalender ansehen ›“ mit Ebene Symptome |
| Karate › Prüfungsdatum | bleibt ein Formularfeld |

Technisch: `Monatskalender` bekommt die Ebenen Gewohnheiten, Krank & verletzt, Medikamente und Schlaf. Daten kommen aus vorhandenen Tabellen, **keine Migration**.

### C Training mit Aktivitätenliste

**Reiter: Übersicht · Auswertung** (statt sechs). Sportarten werden Kacheln mit eigener Seite.

Übersicht (Skizze 2), von oben:
1. Status kompakt: Ring „536 · Aufbau“ und ein Satz. Belastungsverhältnis, Intensitätsminuten und Quelle hinter „Details“.
2. **Diese Woche:** Wochenstreifen mit geplanten und erledigten Einheiten, „+ Einheit“, „Kalender ›“.
3. **Deine Sportarten:** Kacheln Karate · Kettlebell · Bouldern mit je einer Zahl (z. B. „4. Kyu · 18 von 31 sitzen“, „Plan Woche 3“, „Ziel 6A“). Tipp öffnet `/training/karate` usw. Die Inhalte der bisherigen Reiter ziehen unverändert dorthin um.
4. **Alle Aktivitäten** (am Ende):
   - Filter-Pillen nach Sportart (Mehrfachauswahl, gemerkt) und eine Suche (Name, Notiz).
   - Gruppiert nach Woche: „KW 48 · 3 Einheiten · 4 h 10“, darunter je Einheit eine Zeile mit Symbol, Name, Tag, Dauer und Belastung.
   - Neueste oben, 20 Einträge, dann „Weitere laden“. Garmin und selbst erfasste Einheiten gemeinsam.
   - Tipp öffnet `/training/einheit/…`.
   - „Alle ›“ auf Heute springt hierher (`/training#aktivitaeten`).

Auswertung: bisherige Auswertung **und** Insights zusammen, mit Abschnitts-Pillen (siehe D): Ziel heute · Belastung über die Zeit · Woche · Insights. „Was das Ziel bestimmt“ und „Empfehlung je Sportart“ stehen hinter „Details“.

### D Pillen-Baustein `components/ui/Pille.tsx`

Ein Baustein, drei Arten, gleiche Größe und Bedienung.

| Art | Wofür | Aussehen |
|---|---|---|
| **Filter** | Mehrfachauswahl: Kalender-Ebenen, Sportarten, Gewohnheiten | aus: Rand `--line`, Text gedämpft. An: hell `--primary` mit dunkler Schrift. Optional Farbpunkt der Familie vor dem Wort |
| **Einblenden** | „Details“, „Grundlage“, „Faktoren“ unter einer Karte | ruhig, ohne Rand, Wort + ⌄/⌃ |
| **Abschnitt** | lange Seiten: Abschnitte ein- und ausblenden | Zeile oben auf der Seite, bleibt beim Scrollen kurz sichtbar. Ausgeblendete Abschnitte verschwinden ganz |

- Sichtbar 32 px hoch, Tap-Fläche 44 px, Radius rund, Schrift 14, Farben nur aus `globals.css`.
- Zustand wird gemerkt in `settings.data.ansicht` (synchron zwischen iPhone und Computer, Feld ist schon `jsonb`, **keine Migration**). Schlüssel je Ort, z. B. `ansicht.zyklus.abschnitte`, `ansicht.kalender.training`.
- Ersetzt: `chip`, `chip-sm`, `pill`, `pill-sm`, `kp-chip`, `card-toggle`, `habit-manage-toggle`, `unit-sport-pills`, `right-pills`. Bleiben: `segmented` für Reiter und `SpanSwitch` für Zeiträume. Tagebuch-Auswahl (Symptome, Gewohnheiten) nutzt die Art Filter.

**Abschnitts-Pillen** kommen auf diese Seiten:
- Zyklus: Heute · Werte · Symptome · Gewohnheiten · Perioden
- Training › Auswertung: Ziel · Verlauf · Woche · Insights
- Gesundheit › Überblick: Heute · Dein Monat · Muster
- `/heute/schlaf` und `/heute/stress`: Kurve · Bereich · Phasen · Monat

**Einblende-Pillen „Details“** ersetzen dauerhaft sichtbare Erklärungen: Grundlage-Sätze in allen Musterkarten, Rechenweg Belastungsverhältnis, WHO-Quelle, „Was das Ziel bestimmt“, Hinweise im Tagebuch. Quellen bei Medikamenten bleiben sichtbar (Regel Gesundheit und Sicherheit).

### E Neue Gliederung

```
Heute                                            2,0 → 1,8
 ├ Gruß · Datum (öffnet Kalender) · ‹ ›
 ├ Rondell „Dein Tag“ + Satz
 ├ Auf einen Blick
 ├ Heute steht an
 └ Letzte Aktivitäten · „Alle ›“ → Training › Alle Aktivitäten

Tagebuch                                         2,8 → 2,0
 ├ Kopf: Datum (öffnet Monat als Blatt) · ‹ › · Kalender-Symbol
 ├ Check-in
 ├ Blutung (Eisprung-Zeichen hinter Pille)
 ├ Symptome · Anzeichen · Hitzewallungen
 ├ Gewohnheiten · Medikamente · Wadenzucken
 └ (Verlauf 4 Wochen entfällt → Kalender)

Training                                         6 Reiter → 2
 ├ Übersicht                                     3,4 → ca. 2,5 mit Liste
 │  ├ Status kompakt (Details eingeklappt)
 │  ├ Diese Woche (Streifen, + Einheit, Kalender ›)
 │  ├ Deine Sportarten → /training/karate · /kettlebell · /bouldern
 │  └ Alle Aktivitäten (Filter, Suche, nach Woche)
 └ Auswertung (mit Insights)                      5,7 + 3,3 → ca. 3,5, per Pillen kürzer

Zyklus                                           6,7 → ca. 2,5
 ├ Ring mit Phasen · was in dieser Phase üblich ist
 ├ Wochenstreifen · Kalender ›
 ├ [Pillen: Werte · Symptome · Gewohnheiten · Perioden]
 ├ Werte nach Zyklustag
 ├ Symptome nach Zyklustag
 ├ Gewohnheiten je Phase (eingeklappt: nur Sätze, Balken per Tipp)
 └ Perioden: Länge, letzte Zyklen (Nachtragen → Kalender)

Gesundheit                                       Reiter bleiben
 └ Überblick                                     3,8 → ca. 2,0
    ├ Heute auf einen Blick
    ├ Was dir guttut (Wege zu jeder Gewohnheit)
    ├ Dein Monat
    └ Weitere Muster: je Muster ein Satz, Diagramm und Grundlage per Tipp

Kalender /kalender (neu, ohne Navigationspunkt)
 ├ Ebenen-Pillen · Monat · Legende
 ├ Tagesblatt
 └ Zeitraum: Periode · krank · Gewohnheit · vergleichen
```

### F Bewusst nicht geändert

- **Navigation mit fünf Bereichen und Coach-Knopf**: Der Kalender ist ein Werkzeug für alle Bereiche, kein eigener Bereich.
- **Heute**: wurde gerade beruhigt und erfüllt die Regeln schon.
- **Gesundheit-Reiter**: vier Reiter, jeder kurz, klare Fragen.
- **Detailseiten `/heute/…` und `/wert/…`**: Aufbau bleibt, nur die Abschnitts-Pillen kommen dazu.
- **Einstellungen**: übersichtlich, 1,8 Bildschirme.
- **Karate-Prüfungsprogramm**: gerade freigegeben, zieht nur auf eine eigene Seite um.
- **Uhr-App**: nicht betroffen.

### G Umsetzung in Paketen

Jedes Paket ist ein eigener PR mit Fotos vorher/nachher. Alle Pakete gehören zur Rolle Oberfläche, **ohne Migration und ohne Supabase-Funktionen**.

| # | Paket | Nutzen | Inhalt |
|---|---|---|---|
| 1 | Pillen-Baustein | Grundlage | `Pille.tsx` mit drei Arten, Merken in `settings.data.ansicht`, alte Klassen ersetzen |
| 2 | Alle Aktivitäten | hoch, klein | Liste am Ende von Training, Filter, Suche, Heute „Alle ›“ |
| 3 | Zentraler Kalender | hoch | `/kalender`, neue Ebenen, Einstiege über Heute-Datum und `PageHead`, Tagesblatt kurz |
| 4 | Training zwei Reiter | hoch | Übersicht/Auswertung, Sportarten-Seiten, Kalender-Reiter raus, Insights in Auswertung |
| 5 | Zyklus kürzen | hoch | Kalender und Nachtragen raus, Wochenstreifen, Abschnitts-Pillen |
| 6 | Zeitraum im Kalender | mittel | Mehrere Tage wählen: Periode, krank, Gewohnheit, vergleichen |
| 7 | Tagebuch ruhiger | mittel | Datum als Kalender-Blatt, Hinweise raus, Verlauf raus, ein Speicherweg (siehe Frage 1) |
| 8 | Details einklappen | mittel | Einblende-Pillen in Musterkarten, Auswertung, Detailseiten |

### Offene Fragen an die Nutzerin

1. **Tagebuch speichern:** Soll alles sofort speichern, wie heute schon Hitzewallungen, Medikamente und Krämpfe? Dann entfällt der Knopf „Speichern“.
2. **Training:** Passt „Übersicht · Auswertung“ mit Sportarten als Kacheln und eigener Seite, statt sechs Reitern?
3. **Zeitraum im Kalender (Paket 6):** Gewünscht, und reichen die vier Aktionen?
4. **Reihenfolge:** wie in der Tabelle, oder zuerst Kalender (3) vor der Liste (2)?
