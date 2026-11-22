# Health Coach · Konzept: dunkles Design mit Werte-Einordnung

Stand 22.11.2026 · freigegeben als Entwurf, Umsetzung noch nicht begonnen.
Alle Zahlen in den Entwürfen sind Beispieldaten. Keine Diagnosen.

Vorbild: Whoop und Bevel (Ringe, Belastungsziel, Energie über den Tag), dazu die Detailansichten von Apple Health und der persönliche Bereich von Google Health. Grundlage bleibt das AURA // SYNC-Konzept.

## Entscheidungen

- **Dunkel ist der Standard.** Helle Darstellung bleibt als Option (Automatisch, Hell, Dunkel aus PR #33).
- **Keine Bettzeit.** Der Schlafbedarf steht nur als Dauer („etwa 7 h 55“) mit Herleitung: Grundbedarf, Schlafschuld, Zuschlag nach harter Einheit.
- **Keine Ampelfarben** Grün/Gelb/Rot für die Erholung. Farben behalten ihre feste Bedeutung und stehen nie allein, immer mit Zahl oder Wort.
- Kein biologisches Alter (Fitness-Alter gibt es schon), kein Clinician-Zugang.

## Farben im dunklen Design

Als Variablen in `app/globals.css` unter dem dunklen Thema, keine festen Werte in Komponenten. Kontrast mindestens AA.

| Zweck | Wert |
| --- | --- |
| Hintergrund / Karte / Fläche | `#0B0D10` / `#15181D` / `#262B33` |
| Linie | `#3A414B` |
| Text / gedämpfter Text | `#F2F4F7` / `#9AA3AE` |
| Erholung, Readiness (Sage) | `#52B788` |
| Zyklus (Terracotta) | `#E8845A` · Luteal-Fläche `#3A2318` · Follikel-Fläche `#1D232B` |
| Menstruation | `#F28B8B` auf `#3B1E22` |
| Training (Slate-Blau) | `#7C9AE0` · Zielbereich `#3B5998` |
| Symptome, Warnung (Amber) | `#F0A24A` |
| Mobility (Violett) | `#A98BE0` |
| Schlaf (neutral, keine eigene Bedeutungsfarbe) | `#E5E7EB` |

Hauptbutton und aktive Auswahl bleiben hell auf dunkel. Beere `#A3234F` bleibt Markenfarbe (App-Symbol, Coach-Knopf).

## Sechs Regeln für jeden Wert

1. **Satz, Zahl, Bereich, Grafik** in dieser Reihenfolge. Der Satz nennt das Ergebnis, die Zahl steht groß, darunter der persönliche Bereich in Zahlen.
2. **Fester persönlicher Bereich:** letzte 30 Tage ohne heute, mittlere Hälfte der Werte. Er hängt nicht am gewählten Zeitraum. Unter 14 Tagen Daten steht „Bereich ab 14 Tagen“.
3. **Zyklus-angepasst:** In der Lutealphase gilt für HRV, Ruhepuls und Temperatur ein eigener Bereich aus früheren Lutealphasen. Beide Bereiche sind sichtbar.
4. **Readiness mit Beitragsfaktoren:** HRV, Ruhepuls, Schlaf und Last, je mit Bereich und Punkt.
5. **Echte Achsen:** festes Seitenverhältnis, 2–3 beschriftete Hilfslinien, letzter Wert als Zahl am Punkt. Keine Streckung auf 100 × 100.
6. **Zeitraum T · W · M · 6M · J.** Der Satz oben passt sich an. Ab 6M werden Tage zu Wochenmitteln.

## Bildschirme (Entwurf, acht Stück)

Der Entwurf lag als Design-Canvas in Claude vor (privater Link, daher nicht dauerhaft). Maße: iPhone 390 × 844.

1. **Heute:** drei Ringe (Schlaf, Readiness, Belastung mit Zielbogen), Belastungsziel, Schlafbedarf, Vitalwerte („4 von 5 Werten in deinem Bereich“).
2. **HRV-Detail:** Zeitraumwahl, Bereichsband, Phasen getönt, Vergleich nach Zyklusphase, Highlights.
3. **Muster:** Energie über den Tag (Body Battery, Hochrechnung, Training markiert), „Was dir guttut“ (Balken um Nullpunkt mit Anzahl der Nächte).
4. **Readiness:** Ring, Stufenleiste (Erholen, Behutsam, Bereit, Volle Kraft), vier Beitragsfaktoren.
5. **Schlaf:** Phasenbalken, 7-Nächte-Säulen mit Bereich und Ziel, Nachtschweiß-Markierung, Schlafbedarf.
6. **Training:** Wochenlast mit Zielkorridor und Tagessäulen, Belastungsverhältnis, Intensitätsminuten, Mobility.
7. **Kalender:** Monat mit Zyklusphasen als Hintergrund, Training und Symptome als Punkte, kommende Tage heller (geschätzt), Tagesdetail darunter. Liegt unter Training.
8. **Gesundheit:** Zykluslänge mit Bereich von vor einem Jahr, Hitzewallungen pro Woche, Wärmeraster Symptome nach Zyklustag.

## Werte und ihre Einordnung

| Wert | Quelle | Einordnung | Darstellung | Wo |
| --- | --- | --- | --- | --- |
| Readiness | HRV, Ruhepuls, Schlaf, Last 7 Tage | 0–10 in vier Stufen, Beitragsfaktoren | Ring, Stufenleiste, Bereichszeilen | Heute, Readiness |
| HRV | Garmin, Nacht | 30-Tage-Bereich, Luteal eigener | Linie mit Band und Phasen | Heute, Detail |
| Ruhepuls | Garmin | 30-Tage-Bereich, zyklus-angepasst | Bereichszeile, Linie mit Band | Heute, Detail |
| Schlaf | Garmin, Phasen | Bereich + eigenes Ziel, Nachtschweiß aus dem Tagebuch | Phasenbalken, 7-Nächte-Säulen | Heute, Schlaf |
| Body Battery | Garmin | 30-Tage-Bereich | Bereichszeile, Tagesverlauf | Heute, Muster |
| Hauttemperatur | Garmin, Abweichung | ±0,0 °C als Mitte, Anstieg nach Eisprung erwartet | Linie um Nulllinie mit Phasen | Detail |
| Trainingslast | Garmin-Aktivitäten | Wochenkorridor aus 4 Wochen | Bereichsbalken, Tagessäulen | Training |
| Belastungsverhältnis | Last 7 Tage ÷ Schnitt 28 Tage | 0,8–1,3 | Zonen-Skala mit Punkt | Training |
| Intensitätsminuten | Garmin | 150 pro Woche (WHO) | Fortschrittsbalken | Training |
| Zykluslänge | Tagebuch | Bereich vor einem Jahr | Punkte mit Band | Gesundheit |
| Hitzewallungen | Eintrag auf Heute | Schnitt der Wochen davor | Wochensäulen mit Linie | Gesundheit |
| Symptome je Zyklustag | Tagebuch | Häufigkeit über 4 Zyklen | Wärmeraster | Gesundheit, Muster |
| Belastungsziel | Readiness + Schlaf | Zielbereich in % (100 % = harter Trainingstag) | Ring mit Zielbogen, Balken | Heute |
| Schlafbedarf | Grundbedarf 30 Tage, Schlafschuld 7 Tage, Last gestern | erreicht in % vom Bedarf | Ring, Dauer mit Herleitung | Heute, Schlaf |
| Energie über den Tag | Body Battery im Tagesverlauf | Verlauf gegen üblichen Tag | Linie mit Schlaf und Training | Muster |
| Wirkung von Einflüssen | Tagebuch-Einflüsse + HRV der Folgenacht | Unterschied mit/ohne, ab je 5 Nächten | Balken um Nullpunkt mit Anzahl | Muster |
| Gewicht | Eintrag | nur Trend, kein Ziel | Trendlinie | Gesundheit |

## Texte und Sicherheit

- Zusammenhänge statt Ursachen, keine Diagnosen, keine Dosierungsvorschläge.
- Belastungsverhältnis: „unter 0,8 baust du ab, über 1,3 steigt die Last schnell“. Keine Aussage zu Verletzungsrisiko ohne Quelle.
- „Was dir guttut“ ist immer ein Zusammenhang aus den eigenen Tagebuchdaten, nie eine Empfehlung, und erst ab je mindestens 5 Nächten.
- Bei Warnzeichen auf ärztliche Abklärung verweisen. Gewicht nur als Trend.

## Vor dem Start

1. **PR #33 klären oder mergen.** Er ändert `app/globals.css` und „Heute“ (Dunkelwerte, Readiness) und würde mit PR 1 und 2 kollidieren.
2. **`CLAUDE.md` anpassen** (Abschnitt Design): statt „angelehnt an Apple Health und Google Health, Karten auf `#F2F2F7`“ das dunkle Design mit den Farben oben, Ringe als Teil des Stils, Farben weiter nie allein. Per eigenem Zweig und Pull Request.
3. **PR #14** (Zyklus aus Garmin) prüfen, ob er noch gebraucht wird.

## Umsetzung in fünf Pull Requests

Jeder PR mit Bildschirmfotos auf iPhone-Größe.

1. **Fundament:** Bausteine in `components/charts/` (Linie mit Band, Tagessäulen, Bereichszeile, Zonen-Skala, Schlafphasen-Balken, Wärmeraster, Ring). Neue Datei `lib/baseline.ts` für den 30-Tage-Bereich mit Luteal-Variante. Farben als Variablen in `app/globals.css`. Entfällt: Streckung auf 100 × 100, Bereich aus mean ± sd.
2. **Heute:** drei Ringe, Belastungsziel, Schlafbedarf, Readiness mit Beitragsfaktoren, HRV- und Schlafkarte, Vitalwerte-Liste. Entfällt: Garmin-Kacheln, alte Belastungskarte.
3. **Detailansicht (Verlauf):** Zeitraum T · W · M · 6M · J, Bereich als Band, Vergleich nach Zyklusphase, Highlights.
4. **Training, Kalender und Gesundheit:** Wochenlast mit Korridor, Belastungsverhältnis, Intensitätsminuten, Kalender im neuen Stil, Zykluslängen, Hitzewallungen, Symptome nach Zyklustag.
5. **Muster:** Energie über den Tag (`garmin-sync` ruft dafür Body-Battery-Werte über den Tag ab) und „Was dir guttut“.

## Angenommen, bitte vor PR 1 bestätigen

- Bereich 30 Tage, mittlere Hälfte (Alternative: 60 Tage, ruhiger, aber träger).
- Readiness bleibt 0–10.
- Die alte Belastungskarte auf Heute entfällt, sobald die Last als Faktor in der Readiness steht.
- Reihenfolge: PR 1 und 2 zuerst, damit Heute schnell im Alltag getestet werden kann.
