# Farb- und Designkonzept „Nacht“

Stand 23.11.2026 · freigegeben. Ansicht mit allen Farben und Bausteinen: `docs/entwurf-farbkonzept.html`.
Baut auf `docs/design-konzept-dunkel.md` (Konzept dunkel 2) auf und ersetzt dessen Farbteil. Alle Werte in den Beispielen sind Beispieldaten.

## 1. Immer dunkel

- Die App ist immer dunkel, auf dem iPhone und im Browser, egal was im System eingestellt ist.
- Die Wahl „Automatisch · Hell · Dunkel“ unter Einstellungen › Darstellung entfällt. Das helle Thema wird aus `app/globals.css` entfernt.
- Technisch: dunkle Werte direkt auf `:root`, `color-scheme: dark`, `themeColor` immer `#0B0D10`, Statusleiste auf dem iPhone `black-translucent`, Startbild dunkel. `lib/themeBoot.ts` und der gespeicherte Wert `hc_theme` fallen weg.
- `CLAUDE.md` wird angepasst: „Hell bleibt wählbar“ und die hellen Farbwerte werden gestrichen.

## 2. Grundsätze

1. **Sechs Familien, feste Bedeutung.** Jeder Wert gehört zu genau einer Familie und bekommt deren Farbe. Eine Farbe bedeutet überall dasselbe.
2. **Mehr ist heller.** Innerhalb einer Familie zeigt eine hellere Stufe mehr: mehr Stress, höhere Pulszone, höhere Readiness-Stufe. Es gibt kein Rot für „schlecht“ und kein Grün für „gut“.
3. **Nie nur Farbe.** Jede Farbe steht mit Zahl oder Wort. Ein Ring ohne Zahl und Wort gibt es nicht.
4. **Dunkle Flächen, helle Zeichen.** Grund und Karten sind fast schwarz mit leichtem Blaustich. Farbe erscheint als Linie, Ring, Punkt und Wort, nur selten als Fläche.
5. **Kontrast:** Text mindestens 4,5 : 1, Grafik mindestens 3 : 1 auf der Karte. Alle Werte unten sind nachgerechnet.

## 3. Neutrale Farben

| Name | Variable | Wert | Wofür | Kontrast auf Karte |
| --- | --- | --- | --- | --- |
| Grund | `--bg` | `#0B0D10` | Seitenhintergrund | – |
| Karte | `--card` | `#15181D` | Karten | – |
| Karte hoch | `--card-2` (neu) | `#1C2026` | Kachel in einer Karte, aufgeklappte Bereiche | – |
| Fläche | `--fill` | `#262B33` | Spur von Ringen und Balken, Symbolfelder, Knöpfe leise | – |
| Linie leise | `--line-soft` | `#22272E` | Trennlinien in Listen, Gitter in Diagrammen | – |
| Linie | `--line` | `#3A414B` | Rahmen, Ruhe-Anteil beim Stress | – |
| Text | `--text` | `#F2F4F7` | Zahlen, Überschriften, Hauptknopf | 16,2 |
| Text 2 | `--text-2` | `#C9CFD6` | Fließtext, Zeilennamen | 11,3 |
| Gedämpft | `--muted` | `#9AA3AE` | Hinweise, Achsen, Einheiten | 7,0 |
| Achse | `--axis` (neu) | `#7A838F` | nur Achsenstriche und Hilfslinien-Beschriftung | 4,6 |

Karten haben oben einen kaum sichtbaren Lichtrand (`inset 0 1px 0 rgba(255,255,255,0.04)`) statt Schatten. Ebenen entstehen nur über Helligkeit: Grund → Karte → Karte hoch → Fläche.

## 4. Die Familien

Jede Familie hat dieselben Stufen: **Grund** (dunkle Fläche hinter Text, Kopf-Verlauf), **Haupt** (Ring, Linie, Punkt), **Hell** (Nebenwert, höhere Stufe), **Text** (Schrift auf der Grund-Fläche).

### Erholung · Sage
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Grund | `#173326` | Kopf-Verlauf Heute, Vorschlagsfläche, Ringspur |
| Haupt | `#52B788` | Readiness, HRV-Linie |
| Hell | `#8FD5B0` | **Energie (Body Battery)** — neu, bisher ohne Farbe |
| Text | `#C7EBD7` | Schrift auf Sage-Fläche |
| Stufen Readiness | `#34775A` · `#3F9068` · `#52B788` · `#8FD5B0` | Erholen · Behutsam · Bereit · Volle Kraft (mehr ist heller) |

### Schlaf · Mondgrau (neutral)
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Haupt | `#E5E7EB` | Schlaf-Ring, Tiefschlaf |
| REM | `#AEB6C2` | Schlafphasen |
| Leicht | `#7D8794` | Schlafphasen |
| Wach | `#626B78` | Schlafphasen, mit Wort |
| Nachtschweiß | Amber-Punkt | Markierung in der Nacht |

Schlaf bleibt neutral, damit er sich nie mit einer Bedeutungsfarbe vermischt. Tiefschlaf ist am hellsten, weil er am meisten zählt.

### Belastung und Training · Slate-Blau
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Grund | `#1B2438` | Kopf-Verlauf Training, Fläche |
| Ziel | `#3B5998` | Zielbereich, Korridor-Band |
| Haupt | `#7C9AE0` | Belastung durch Training, Last-Linie, Kettlebell |
| Alltag | `#C3D1F2` | Belastung aus dem Alltag (heller, weil Teil derselben Last) |
| Text | `#AFC2EE` | Schrift auf Fläche |
| Pulszonen 1–5 | `#5A73A8` · `#6B86C4` · `#7C9AE0` · `#A9BDF0` · `#D3DDF7` | mehr Puls ist heller |
| Sport | Karate `#A9BDF0` · Kettlebell `#7C9AE0` · Klettern `#5B78C4` · Ausdauer `#D3DDF7` · Sonstiges `#9AA3AE` | immer mit Symbol |

### Stress · Türkis
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Grund | `#12302F` | Kopf-Verlauf Stress-Seite |
| Ruhe | `#5C6571` | neutral, Ruhe ist kein Stress |
| niedrig · mittel · hoch | `#2F6E6C` · `#3C9E9A` · `#6FD8D4` | Aufteilung, Halbbogen-Verlauf |
| Haupt | `#45C4C0` | Stress-Ring, Wort |
| Text | `#9FE3E0` | Schrift auf Fläche |

### Zyklus · Terracotta
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Grund | `#3A2318` | Kopf-Verlauf Zyklus, Lutealphase im Kalender |
| Haupt | `#E8845A` | Zyklus-Ring, Zyklustag, Eisprung (35 % Deckkraft als Fläche) |
| Text | `#F2B193` | Schrift auf Fläche |
| Menstruation | `#F28B8B` auf `#3B1E22` | Periodentage |
| Follikelphase | `#1D232B` | Kalenderfläche |
| Hauttemperatur | Terracotta-Linie | weil sie den Zyklus anzeigt |

### Hinweis · Amber
| Stufe | Wert | Verwendung |
| --- | --- | --- |
| Grund | `#3A2A12` | Hinweisfläche |
| Haupt | `#F0A24A` | Symptome, Hitzewallungen, Nachtschweiß, „seit 3 Tagen über deinem Bereich“ |
| Text | `#F6C98E` | Schrift auf Fläche |

Amber heißt „schau hin“, nie „krank“. Warnzeichen mit Verweis auf ärztliche Abklärung stehen auf Amber-Fläche mit Satz.

### Ergänzend
| Familie | Werte | Verwendung |
| --- | --- | --- |
| Mobility · Violett | `#A98BE0`, Grund `#2A2140`, Text `#CDB9F0` | Mobility-Einheiten, Dehnen |
| Marke · Beere | Knopf `#A3234F`, hell `#E0527F` | Coach-Knopf, Rand der Erklärkarte am Ende des Verlaufs („das kommt vom Coach“) |
| Körper · neutral | Text-Farben | Gewicht (nur Trend), Medikamente, Krankheit und Verletzung (Wort + Symbol) |

## 5. Welcher Wert bekommt welche Farbe

| Wert | Familie | Farbe im Ring oder Diagramm | Auf Heute |
| --- | --- | --- | --- |
| Readiness | Erholung | Sage `#52B788` | Ring Mitte |
| Energie (Body Battery) | Erholung | Sage hell `#8FD5B0` | Ring |
| HRV | Erholung | Linie Sage, Band Sage-Grund | Kachel (Symbol neutral) |
| Ruhepuls | Erholung | Linie Sage hell | Kachel |
| Atemfrequenz | Erholung | Linie Text 2 | Kachel |
| Hauttemperatur | Zyklus | Linie Terracotta | Kachel |
| Schlaf, Schlafbedarf | Schlaf | Mondgrau `#E5E7EB` | Ring, Kachel |
| Belastung heute | Training | Slate `#7C9AE0` + Alltag `#C3D1F2`, Zielbogen `#3B5998` | Ring |
| Last 7 Tage, Belastungsverhältnis | Training | Slate | – |
| Stress | Stress | Türkis `#45C4C0`, Stufen heller | Ring |
| Zyklustag, Phase | Zyklus | Terracotta | Kachel (Symbol Terracotta) |
| Symptome, Hitzewallungen | Hinweis | Amber | – |
| Gewohnheiten | neutral, Wirkung in Sage/Amber-Balken um den Nullpunkt mit Zahl | – |
| Medikamente | neutral, Häkchen in Text-Farbe | Zeile |

**Kacheln auf Heute:** Symbolfeld neutral (`--fill`), nur Zyklus in Terracotta. Die Zahl ist weiß, das Wort darunter gedämpft. Nur ein Hinweis („seit 3 Tagen über“) erscheint in Amber. So bleibt Heute ruhig, und Farbe fällt nur dort auf, wo sie etwas sagt.

## 6. Schrift

Inter, Ziffern in gleicher Breite (`tabular-nums`). Eine feste Skala, nichts dazwischen:

| Stufe | Größe / Gewicht | Wofür |
| --- | --- | --- |
| Zahl groß | 56 / 800, −2 % | Zahl im großen Ring, Halbbogen |
| Zahl | 28 / 800 | Ring auf Heute (Mitte), Kacheln groß |
| Titel | 30 / 800 | Seitentitel, Gruß |
| Überschrift | 17 / 700 | Abschnitt („Dein Tag“) |
| Wert | 18 / 700 | Zahl in Kachel und Liste |
| Text | 15 / 400, Zeilenhöhe 1,45 | Sätze, Erklärkarte |
| Klein | 13 / 500 | Zeilennamen, Wort unter dem Ring |
| Hinweis | 12 / 400 | Einordnung, Stand, Quelle |
| Eyebrow | 11 / 700, Großbuchstaben, Sperrung 12 % | Titel der Detailseite, „Mehr dazu im Coach“ |

## 7. Raster, Radien, Abstände

- Raster 4 px. Abstände 4 · 8 · 12 · 16 · 24 · 32. Seitenrand 16, zwischen Abschnitten 24–28, zwischen Kacheln 10.
- Radien: Karte 24, Kachel 18, Symbolfeld und Steuerelement 12, Pillen rund.
- Tap-Ziele mindestens 44 × 44.

## 8. Bausteine

| Baustein | Maße | Regeln |
| --- | --- | --- |
| Ring klein / mittel / groß | 84 / 112 / 210 px, Strich 5 % (groß 9 px) | dezent: schmaler Strich, Spur `--ring-track` `#20252C` (dunkler als Fläche), runde Enden, Start oben. Zahl im Ring, Wort darüber oder darunter. Ziel als dünner Bogen außen (2 px). |
| Halbbogen | 300 px, 234°, Strich 8 | Punkt in Text-Farbe am Wert, 0 und Maximum beschriftet, Ziel außen 3 px |
| Erklärkarte | Radius 18, Rand 1,5 px | Rand-Verlauf von Familienfarbe zu Beere hell, Satz mit fetten Zahlen, „Mehr dazu im Coach →“ |
| Kachel | 2 Spalten, min. 72 hoch | Symbolfeld 40 px links, Name, Wert, Wort |
| Liste | Zeile min. 64 hoch | Symbolfeld, zwei Zeilen Text, Pfeil oder Pille rechts |
| Stufenleiste | 4 Felder, 5 px hoch | Sage-Stufen, aktive Stufe fett beschriftet |
| 3-Stufen-Balken | 3 Felder | unter · im · über deinem Bereich, nur die aktive Stufe in Familienfarbe |
| Diagramm | festes Seitenverhältnis | 2–3 Hilfslinien `--line-soft`, Band = Familien-Grund, letzter Punkt mit Zahl, Überschrift als Satz |
| Seitenkopf | 300 px Verlauf | Familien-Grund → Grund. Heute Sage, Training Slate, Zyklus Terracotta, Gesundheit Fläche, Stress-Seite Türkis, Schlaf-Seite Fläche |

## 9. Symbole und Bewegung

- Liniensymbole 24-px-Raster, Strich 1,8, runde Enden, in einem Feld 40 × 40, Radius 12. Sport mit eigenen Symbolen, nie mit Kürzeln.
- Ringe füllen sich beim Öffnen einmal in 600 ms, Seitenwechsel 280 ms. Bei „Bewegung reduzieren“ ohne Animation.

## 10. Was sich gegenüber heute ändert

| Bisher | Neu |
| --- | --- |
| Hell und Dunkel wählbar, Standard nach System | immer dunkel |
| Energie ohne eigene Farbe | Sage hell |
| Readiness-Stufen alle gleich | vier Sage-Stufen, mehr ist heller |
| Pulszonen ohne feste Farbe | fünf Slate-Stufen, mehr ist heller |
| Schlafphasen ohne feste Abstufung | Tief → REM → Leicht → Wach von hell nach dunkel |
| Hauttemperatur neutral | Terracotta (Zyklus) |
| Erklärkarte Rand in Bereichsfarbe | Verlauf zur Beere als Zeichen für den Coach |
| Karte ohne Ebene darin | neue Ebene „Karte hoch“ `#1C2026` |
| Achsen gedämpft | eigene Achsenfarbe `#7A838F` |
| Ringe mit breitem Strich (9 von 104) | schmal (5 von 104), Halbbogen 8 statt 14, Spur dunkler (Wunsch 23.11.) |

## Entschieden (23.11.2026)

1. Immer dunkel auch im Browser, nicht nur auf dem iPhone.
2. Energie in Sage hell (Familie Erholung).
3. Rand der Erklärkarte läuft zur Beere aus.

## Umsetzung nach Freigabe

1. PR „Immer dunkel“: helles Thema und Einstellung entfernen, `CLAUDE.md` anpassen.
2. PR „Farben Nacht“: neue Variablen in `app/globals.css`, Bausteine auf die Familienfarben umstellen.
3. Danach Heute nach `docs/konzept-heute-einstieg.md`.
