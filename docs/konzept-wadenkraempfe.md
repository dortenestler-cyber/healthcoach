# Konzept: Wadenzucken und Wadenkrämpfe erfassen und auswerten

Stand: 22.11.2026 · Status: **Entwurf, wartet auf Freigabe**

## Ziel
1. Wadenzucken und Wadenkrämpfe schnell erfassen, auch nachts und von der Uhr.
2. Krämpfe **und Erkrankungen** laufen in eine gemeinsame Mustererkennung mit Zyklus, Training, Schlaf und Tagebuch.
3. Die App nennt Zusammenhänge, keine Ursachen und keine Diagnosen. Bei Warnzeichen verweist sie auf ärztliche Abklärung.

---

## 1. Erfassung

### Warum ein eigener Eintrag und kein weiteres Symptom im Tagebuch
Das Tagebuch speichert Symptome einmal pro Tag (leicht, mittel, stark). Bei Krämpfen zählt mehr: **wann** (nachts, in Ruhe, beim Training, danach), **wie oft** und **wo**. Deshalb werden sie wie Hitzewallungen als einzelne Ereignisse gespeichert.

### Neue Tabelle `muscle_events`
| Feld | Bedeutung |
|---|---|
| `at` | Zeitpunkt (Standard: jetzt, nachträglich änderbar) |
| `day` | Kalendertag. Nächtliche Krämpfe zählen zur Nacht davor, also zum Vortag, damit „Training heute → Krampf heute Nacht“ zusammenpasst |
| `kind` | `zucken` oder `krampf` |
| `strength` | 1 leicht · 2 mittel · 3 stark |
| `side` | links · rechts · beide |
| `spot` | Wade (Standard) · Fuß · Oberschenkel · andere |
| `situation` | nachts im Bett · in Ruhe · beim Training · nach dem Training |
| `duration` | optional: Sekunden · bis 1 Minute · länger |
| `note` | optional |
| `source` | `app` oder `uhr` |

Zugriffsschutz pro Konto (Row Level Security) wie bei allen Tabellen.

### Wo man es einträgt
- **Tagebuch**: neuer Abschnitt „Muskeln“ mit zwei großen Knöpfen „Zucken“ und „Krampf“. Ein Tipp speichert sofort mit Standardwerten (Wade, Situation nach Uhrzeit geraten). Details lassen sich danach aufklappen.
- **Morgen-Check-in**: eine zusätzliche Frage „Heute Nacht Krämpfe oder Zucken?“ (Nein · Zucken · Krampf). So geht ein nächtlicher Krampf nicht verloren, wenn man nachts nichts eintippt.
- **Uhr (Connect IQ)**: ein Eintrag „Krampf“ neben der Hitzewallung, ein Druck genügt. Kann später kommen.
- **Einstellungen › Funktionen**: „Muskeln“ ein- und ausblendbar wie Zyklus und Medikamente.

### Optionale neue Einflüsse im Tagebuch
Damit die Auswertung mehr als Training und Zyklus prüfen kann, zwei neue Einflüsse zum Antippen:
- „wenig getrunken“
- „viel geschwitzt / Hitze“

(Die vorhandenen Einflüsse Alkohol, Koffein, Stress und Sport bleiben.)

---

## 2. Gemeinsame Mustererkennung

### Idee
Statt für jede Frage eigenen Code zu schreiben, gibt es einen **Muster-Motor**: Er nimmt ein *Ereignis* (zum Beispiel „Krampftag“) und vergleicht, wie oft es unter einer *Bedingung* auftritt und wie oft ohne. Das gleiche Verfahren nutzt die App heute schon für „Einflüsse und Schlaf“ und den Bufori-Bedarf.

### Ereignisse, die geprüft werden
| Ereignis | Woraus |
|---|---|
| Krampftag / Zucktag | `muscle_events` |
| Beginn einer Erkrankung | `illnesses.started_on` |
| Krankheitstage | `illnesses` von Beginn bis Ende |
| Hitzewallungen (bereits vorhanden) | `hot_flashes` |

### Bedingungen (alles Daten, die die App schon hat)
| Bereich | Bedingung | Zeitbezug |
|---|---|---|
| Zyklus | Zyklusphase: Periode · Tag 6–13 · Tag 14–20 · 5 Tage vor der Periode | gleicher Tag |
| Training | harter Tag (Belastung ab 70 %) | gleicher Tag und Nacht danach |
| Training | Sportart: Ausdauer, Bouldern, Karate, Kettlebell, Ruhetag | gleicher Tag |
| Training | hohe Wochenbelastung (7 Tage über dem eigenen Schnitt) | die 7 Tage davor |
| Schlaf und Erholung | niedrige HRV, erhöhter Ruhepuls, schlechter Schlafwert | Nacht davor |
| Tagebuch | Alkohol, Koffein, Stress, wenig getrunken, viel geschwitzt | gleicher Tag |
| Perimenopause | Nachtschweiß, viele Hitzewallungen | gleicher Tag |
| Gesundheit | krank, mit Fieber | gleicher Tag |
| Medikamente und Supplements | Einnahme eines selbst eingetragenen Mittels an diesem Tag | gleicher Tag |

Für **Erkrankungen** wird zusätzlich rückwärts geschaut: Wie sahen die **7 Tage vor Krankheitsbeginn** aus (Trainingsbelastung, HRV, Ruhepuls, Schlaf, Zyklusphase) im Vergleich zu normalen Wochen? Daraus kann später ein vorsichtiger Hinweis entstehen wie „Vor deinen letzten Erkältungen war dein Ruhepuls zwei Tage lang erhöht“.

### Regeln, damit keine Zufallsmuster angezeigt werden
- Ein Muster erscheint erst, wenn genug Daten da sind: mindestens **8 Tage mit dem Ereignis** und je Gruppe mindestens **4 Tage**. Bei Erkrankungen mindestens **3 Krankheitsbeginne**. Vorher zeigt die Karte, was noch fehlt („bisher 3 von 8 Krampftagen“), wie die heutigen Muster auch.
- Angezeigt wird nur ein deutlicher Unterschied (zum Beispiel mindestens doppelt so häufig und mindestens 3 Tage mehr).
- Höchstens die **drei stärksten** Zusammenhänge je Ereignis, damit die Seite übersichtlich bleibt.
- Jede Karte nennt die Grundlage („14 Krampftage in 90 Tagen“) und den Satz „Zusammenhang, kein Beweis“.

### Beispieltexte (Beispieldaten)
- *Beispiel:* „An den 5 Tagen vor der Periode hattest du an 4 von 10 Tagen nachts Wadenkrämpfe, sonst an 1 von 10.“
- *Beispiel:* „Nach langen Ausdauereinheiten kam in der Nacht danach doppelt so oft ein Krampf wie nach Ruhetagen.“
- *Beispiel:* „An Tagen mit ‚wenig getrunken‘ hattest du 3-mal so oft Wadenzucken.“
- *Beispiel:* „Deine letzten 3 Erkältungen begannen nach einer Woche mit hoher Trainingsbelastung.“

---

## 3. Wo die Ergebnisse stehen

| Seite | Was neu ist |
|---|---|
| **Heute** | nichts Dauerhaftes. Nur wenn ein bekanntes Muster heute zutrifft, ein kurzer Hinweis, etwa „Heute ist ein Tag, an dem du öfter Krämpfe hattest: viel trinken, abends dehnen“ |
| **Tagebuch** | Erfassung (Abschnitt „Muskeln“) |
| **Zyklus** | „Krampf“ und „Zucken“ als Zeilen im Raster „Symptome nach Zyklustag“ und im Diagramm „Einflüsse je Phase“ |
| **Gesundheit** | neue Karte „Muskeln“: Krampftage pro Woche (12 Wochen, Amber, mit Überschrift als Ergebnis-Satz), Verteilung nach Situation (nachts, Training …), darunter die gefundenen Muster. Bei „Erkrankungen“ neu: „Was vor deinen Erkrankungen auffiel“ |
| **Training** | Hinweis, wenn eine Sportart oder hohe Belastung mit Krämpfen zusammenhängt |
| **Zyklus › Weitere Muster** | Muster ohne Zyklusbezug (Training, Einflüsse, Schlaf) |
| **Coach** | bekommt nur zusammengefasste Zahlen (zum Beispiel „Krampftage letzte 30 Tage: 6, davon 4 vor der Periode“), keine Einzeleinträge und keine Notizen |

Design: Symptome in Amber (`--amber`), immer mit Text, Farben aus `app/globals.css`, Tap-Ziele mindestens 44 px.

---

## 4. Gesundheit und Sicherheit
- **Keine Diagnose, keine Dosierung.** Die App empfiehlt kein Magnesium und keine Menge. Wer ein Supplement einträgt, sieht nur den neutralen Vergleich „Tage mit Einnahme / ohne Einnahme“.
- **Medikamente:** Ein Hinweis, dass ein Medikament Krämpfe begünstigen kann, erscheint nur mit Quelle (Fachinformation oder Gebrauchsinformation).
- **Warnzeichen** – die App zeigt dann „Bitte ärztlich abklären lassen“:
  - Wade geschwollen, warm, gerötet oder schmerzt anhaltend, besonders auf einer Seite
  - Krämpfe werden deutlich häufiger (zum Beispiel doppelt so viele Tage wie in den 4 Wochen davor) oder kommen fast jede Nacht
  - Schwäche, Taubheit oder Kribbeln im Bein
  - Zucken, das sich auf andere Körperstellen ausbreitet
  - Krämpfe kurz nach Beginn eines neuen Medikaments

  Die ersten Punkte lassen sich beim Eintragen als Kästchen „Schwellung / Rötung“ und „Schwäche / Taubheit“ abfragen; ist eins angekreuzt, erscheint der Hinweis sofort.

---

## 5. Umsetzung in Schritten
Jeder Schritt ist ein eigener Pull Request.

1. **Erfassung**: Migration `muscle_events`, Abschnitt im Tagebuch, Frage im Check-in, Funktions-Schalter, Export/Backup ergänzen. *Migration braucht deine Freigabe und deine Ausführung in Supabase.*
2. **Auswertung Krämpfe**: Muster-Motor in `lib/muster.ts`, Karte auf Gesundheit, Zeilen auf der Seite Zyklus, Warnzeichen-Hinweise.
3. **Erkrankungen in der Mustererkennung**: Rückblick vor Krankheitsbeginn, Krankheitstage als Bedingung für die anderen Muster.
4. **Coach und Heute**: zusammengefasste Zahlen an den Coach, Tageshinweis auf Heute.
5. **Uhr**: Krampf-Eintrag in der Connect-IQ-App (passt zu Phase 5).

---

## 6. Offene Fragen an dich
1. **Zucken und Krampf getrennt** erfassen (wie oben) oder als eine Sache mit Stärke 1–3?
2. Treten sie meist **nachts** auf? Dann ist die Check-in-Frage am Morgen besonders wichtig.
3. Sollen die neuen Einflüsse **„wenig getrunken“** und **„viel geschwitzt“** dazukommen?
4. Nimmst du ein **Supplement**, das du schon in der App einträgst (zum Beispiel Magnesium)? Dann wird der Vergleich mit/ohne Einnahme automatisch mitgeprüft.
5. Möchtest du den **Uhr-Knopf** gleich mit oder später?
