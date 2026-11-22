# Konzept: Wadenzucken und Wadenkrämpfe erfassen und auswerten

Stand: 22.11.2026 · Status: **Fragen beantwortet, wartet auf Freigabe zur Umsetzung**

## Ziel
1. Wadenzucken und Wadenkrämpfe schnell erfassen, als eine Sache mit Intensität. Sie kommen meist abends.
2. Krämpfe **und Erkrankungen** laufen in eine gemeinsame Mustererkennung mit Zyklus, Training, Schlaf und Tagebuch.
3. Die App nennt Zusammenhänge, keine Ursachen und keine Diagnosen. Bei Warnzeichen verweist sie auf ärztliche Abklärung.

---

## 1. Erfassung

### Warum ein eigener Eintrag und kein weiteres Symptom im Tagebuch
Das Tagebuch speichert Symptome einmal pro Tag (leicht, mittel, stark). Bei Krämpfen zählt mehr: **wann** (abends, beim Training, danach), **wie oft** und **wo**. Deshalb werden sie wie Hitzewallungen als einzelne Ereignisse gespeichert.

### Neue Tabelle `muscle_events`
| Feld | Bedeutung |
|---|---|
| `at` | Zeitpunkt (Standard: jetzt, nachträglich änderbar) |
| `day` | Kalendertag. Ein Eintrag nach Mitternacht zählt noch zum Abend davor |
| `intensity` | eine Skala statt getrennter Arten: 1 Zucken · 2 Krampf · 3 starker Krampf |
| `side` | links · rechts · beide |
| `spot` | Wade (Standard) · Fuß · Oberschenkel · andere |
| `situation` | abends in Ruhe (Standard) · tagsüber · beim Training · nach dem Training · nachts |
| `duration` | optional: Sekunden · bis 1 Minute · länger |
| `note` | optional |
| `source` | `app` oder `uhr` |

Zugriffsschutz pro Konto (Row Level Security) wie bei allen Tabellen.

### Wo man es einträgt
- **Tagebuch**: neuer Abschnitt „Muskeln“ mit einem großen Knopf „Wade“ und drei Stufen (Zucken · Krampf · stark). Ein Tipp speichert sofort mit Standardwerten (Wade, abends in Ruhe). Details lassen sich danach aufklappen.
- **Nachtragen**: Weil die Krämpfe abends kommen, kann man sie auch am nächsten Morgen noch für den Vortag eintragen. Der Morgen-Check-in bekommt deshalb keine eigene Frage.
- **Uhr (Connect IQ)**: kommt später, darauf kommen wir gesondert zurück.
- **Einstellungen › Funktionen**: „Muskeln“ ein- und ausblendbar wie Zyklus und Medikamente.

### Optionale neue Einflüsse im Tagebuch
Freigegeben: zwei neue Einflüsse zum Antippen.
- „wenig getrunken“
- „viel geschwitzt / Hitze“

(Die vorhandenen Einflüsse Alkohol, Koffein, Stress und Sport bleiben.)

### Magnesium
Magnesium wird als Supplement in der App eingetragen. Die Auswertung vergleicht Tage mit und ohne Einnahme. Die App empfiehlt keine Menge und keinen Zeitpunkt.

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
| Training | harter Tag (Belastung ab 70 %) | gleicher Tag (Krampf am Abend danach) |
| Training | Sportart: Ausdauer, Bouldern, Karate, Kettlebell, Ruhetag | gleicher Tag |
| Training | hohe Wochenbelastung (7 Tage über dem eigenen Schnitt) | die 7 Tage davor |
| Schlaf und Erholung | niedrige HRV, erhöhter Ruhepuls, schlechter Schlafwert | Nacht davor |
| Abend | Schlaf in der Nacht nach einem Krampfabend | Nacht danach (Ergebnis, nicht Ursache) |
| Tagebuch | Alkohol, Koffein, Stress, wenig getrunken, viel geschwitzt | gleicher Tag |
| Perimenopause | Nachtschweiß, viele Hitzewallungen | gleicher Tag |
| Gesundheit | krank, mit Fieber | gleicher Tag |
| Medikamente und Supplements | Einnahme eines selbst eingetragenen Mittels an diesem Tag, zuerst Magnesium | gleicher Tag |

Für **Erkrankungen** wird zusätzlich rückwärts geschaut: Wie sahen die **7 Tage vor Krankheitsbeginn** aus (Trainingsbelastung, HRV, Ruhepuls, Schlaf, Zyklusphase) im Vergleich zu normalen Wochen? Daraus kann später ein vorsichtiger Hinweis entstehen wie „Vor deinen letzten Erkältungen war dein Ruhepuls zwei Tage lang erhöht“.

### Regeln, damit keine Zufallsmuster angezeigt werden
- Ein Muster erscheint erst, wenn genug Daten da sind: mindestens **8 Tage mit dem Ereignis** und je Gruppe mindestens **4 Tage**. Bei Erkrankungen mindestens **3 Krankheitsbeginne**. Vorher zeigt die Karte, was noch fehlt („bisher 3 von 8 Krampftagen“), wie die heutigen Muster auch.
- Angezeigt wird nur ein deutlicher Unterschied (zum Beispiel mindestens doppelt so häufig und mindestens 3 Tage mehr).
- Höchstens die **drei stärksten** Zusammenhänge je Ereignis, damit die Seite übersichtlich bleibt.
- Jede Karte nennt die Grundlage („14 Krampftage in 90 Tagen“) und den Satz „Zusammenhang, kein Beweis“.

### Beispieltexte (Beispieldaten)
- *Beispiel:* „An den 5 Tagen vor der Periode hattest du an 4 von 10 Abenden Wadenkrämpfe, sonst an 1 von 10.“
- *Beispiel:* „Nach langen Ausdauereinheiten kam am Abend doppelt so oft ein Krampf wie an Ruhetagen.“
- *Beispiel:* „An Tagen mit ‚wenig getrunken‘ hattest du 3-mal so oft Wadenzucken.“
- *Beispiel:* „Deine letzten 3 Erkältungen begannen nach einer Woche mit hoher Trainingsbelastung.“

---

## 3. Wo die Ergebnisse stehen

| Seite | Was neu ist |
|---|---|
| **Heute** | nichts Dauerhaftes. Nur wenn ein bekanntes Muster heute zutrifft, ein kurzer Hinweis, etwa „Heute ist ein Tag, an dem du öfter Krämpfe hattest: viel trinken, abends dehnen“ |
| **Tagebuch** | Erfassung (Abschnitt „Muskeln“) |
| **Zyklus** | „Krampf“ und „Zucken“ als Zeilen im Raster „Symptome nach Zyklustag“ und im Diagramm „Einflüsse je Phase“ |
| **Gesundheit** | neue Karte „Muskeln“: Krampftage pro Woche nach Intensität (12 Wochen, Amber, mit Überschrift als Ergebnis-Satz), Verteilung nach Situation (abends, Training …), darunter die gefundenen Muster. Bei „Erkrankungen“ neu: „Was vor deinen Erkrankungen auffiel“ |
| **Training** | Hinweis, wenn eine Sportart oder hohe Belastung mit Krämpfen zusammenhängt |
| **Zyklus › Weitere Muster** | Muster ohne Zyklusbezug (Training, Einflüsse, Schlaf) |
| **Coach** | bekommt nur zusammengefasste Zahlen (zum Beispiel „Krampftage letzte 30 Tage: 6, davon 2 stark, 4 vor der Periode“), keine Einzeleinträge und keine Notizen |

Design: Symptome in Amber (`--amber`), immer mit Text, Farben aus `app/globals.css`, Tap-Ziele mindestens 44 px.

---

## 4. Gesundheit und Sicherheit
- **Keine Diagnose, keine Dosierung.** Die App empfiehlt kein Magnesium und keine Menge. Wer ein Supplement einträgt, sieht nur den neutralen Vergleich „Tage mit Einnahme / ohne Einnahme“.
- **Medikamente:** Ein Hinweis, dass ein Medikament Krämpfe begünstigen kann, erscheint nur mit Quelle (Fachinformation oder Gebrauchsinformation).
- **Warnzeichen** – die App zeigt dann „Bitte ärztlich abklären lassen“:
  - Wade geschwollen, warm, gerötet oder schmerzt anhaltend, besonders auf einer Seite
  - Krämpfe werden deutlich häufiger (zum Beispiel doppelt so viele Tage wie in den 4 Wochen davor) oder kommen fast jeden Abend
  - Schwäche, Taubheit oder Kribbeln im Bein
  - Zucken, das sich auf andere Körperstellen ausbreitet
  - Krämpfe kurz nach Beginn eines neuen Medikaments

  Die ersten Punkte lassen sich beim Eintragen als Kästchen „Schwellung / Rötung“ und „Schwäche / Taubheit“ abfragen; ist eins angekreuzt, erscheint der Hinweis sofort.

---

## 5. Umsetzung in Schritten
Jeder Schritt ist ein eigener Pull Request.

1. **Erfassung**: Migration `muscle_events`, Abschnitt im Tagebuch mit Nachtragen für den Vortag, neue Einflüsse, Funktions-Schalter, Export/Backup ergänzen. *Migration braucht deine Freigabe und deine Ausführung in Supabase.*
2. **Auswertung Krämpfe**: Muster-Motor in `lib/muster.ts`, Karte auf Gesundheit, Zeilen auf der Seite Zyklus, Warnzeichen-Hinweise.
3. **Erkrankungen in der Mustererkennung**: Rückblick vor Krankheitsbeginn, Krankheitstage als Bedingung für die anderen Muster.
4. **Coach und Heute**: zusammengefasste Zahlen an den Coach, Tageshinweis auf Heute.
5. **Uhr**: später, wir kommen gesondert darauf zurück.

---

## 6. Entscheidungen (22.11.2026)
1. Zucken und Krampf sind **eine Sache mit Intensität** (1 Zucken · 2 Krampf · 3 starker Krampf).
2. Die Krämpfe kommen **meist abends**, nicht nachts. Deshalb gibt es keine Frage im Morgen-Check-in, dafür das Nachtragen für den Vortag.
3. Die Einflüsse **„wenig getrunken“** und **„viel geschwitzt“** kommen dazu.
4. **Magnesium** wird eingetragen und in der Auswertung mitgeprüft.
5. Die **Uhr** kommt später, darauf kommen wir gesondert zurück.
