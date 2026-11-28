# Store-Eintrag: Uhr-App

Texte zum Einfügen im Garmin-Entwicklerportal (apps.garmin.com/developer/upload). Bilder liegen in diesem Ordner, die Datei `HealthCoach.iq` baut der Lauf „Uhr-App bauen“.

## Name
Health Coach

## Typ
Geräte-App (Watch App) mit Glance

## Kurzbeschreibung
Getränke, Check-in und Kettlebell direkt an der Uhr erfassen.

## Beschreibung
Die Uhr-App zur App Health Coach. Was du an der Uhr einträgst, landet sofort in deinem Tagebuch.

- Glance: Tagesziel bisher, Zielbereich, was das Ziel heute senkt, und die nächste Einheit
- Getränke eintragen (Wasser, Kaffee, Tee, Alkohol) mit Glas, das sich füllt, und Uhrzeit für Koffein
- Infektverdacht als Zeichen
- Einnahmen abhaken
- Morgen-Check-in mit drei Fragen
- Heute geplant
- Kettlebell-Timer mit Sätzen, Gewicht und Wiederholungen

Die App braucht den Uhr-Schlüssel aus Health Coach (Einstellung „Uhr-Schlüssel“) und eine Verbindung zum Handy. Die Screenshots zeigen Beispieldaten.

## Neu in dieser Version
Neues Menü mit Zeichen für den Zustand. Getränke mit Füllstand und Uhrzeit eintragen, Infektverdacht sichtbar. Hitzewallung und Bufori entfernt.

## Bilder
- Store-Icon: `store-icon-500.png` (500 × 500, App-Symbol Ensō)
- Screenshots in dieser Reihenfolge:
  1. `1-glance.jpg`: Glance in der Glance-Liste
  2. `2-menue.jpg`: Menü der App
  3. `3-getraenk.jpg`: Getränke mit Füllstand

Neu erzeugen: `node watchface/tools/store_bilder.js`
