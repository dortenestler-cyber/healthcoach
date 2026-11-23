# Store-Eintrag: Zifferblatt

Texte zum Einfügen im Garmin-Entwicklerportal (apps.garmin.com/developer/upload). Bilder liegen in diesem Ordner, die Datei `HealthCoachFace.iq` baut der Lauf „Uhr-App bauen“.

## Name
Health Coach Datenraster

## Typ
Zifferblatt (Watch Face)

## Kurzbeschreibung
Digitales Zifferblatt im Stil einer LCD-Uhr, verbunden mit der App Health Coach.

## Beschreibung
Dunkles, digitales Zifferblatt mit Segmentziffern und schwach sichtbaren Geisterziffern. Es zeigt Werte aus Garmin und aus der App Health Coach: Zyklustag, Tagesziel, Body Battery, Hitzewallungen, nächste Einheit und mehr.

Fünf Layouts:
- Datenraster: 14 Felder und zwei Strich-Anzeigen
- Monolith: nur die Uhrzeit, groß, und ein Wert
- Zyklus-Spur: ein Punkt je Zyklustag am Rand
- Stapel: Stunden über Minuten, drei Werte daneben
- Eine Zeile: Uhrzeit und drei Werte

Einstellungen in Garmin Connect:
- Layout
- Wert für jedes Feld
- Farbmodus: Einfarbig, Bedeutung (jeder Wert in der Farbe seiner Familie) oder Nacht
- Nacht automatisch zur Schlafenszeit

„Immer an“ zeigt die Uhrzeit dünn und gedimmt, wandernd gegen Einbrennen.

Für die Werte aus Health Coach braucht das Zifferblatt den Uhr-Schlüssel aus der App (Einstellung „Uhr-Schlüssel“). Die Screenshots zeigen Beispieldaten.

## Neu in dieser Version
Neue Layouts Monolith, Zyklus-Spur, Stapel und Eine Zeile. Farbmodus statt einzelner Farben. Schärfere Darstellung auf ganze Pixel.

## Bilder
- Store-Icon: `store-icon-500.png` (500 × 500)
- Screenshots in dieser Reihenfolge:
  1. `1-datenraster.jpg`: Datenraster, Einfarbig
  2. `2-datenraster-bedeutung.jpg`: Datenraster, Farbmodus Bedeutung
  3. `3-monolith.jpg`: Monolith
  4. `4-zyklus-spur.jpg`: Zyklus-Spur, Farbmodus Bedeutung
  5. `5-stapel.jpg`: Stapel
  6. `6-eine-zeile.jpg`: Eine Zeile
  7. `7-immer-an.jpg`: Anzeige „Immer an“

Neu erzeugen: `node watchface/tools/store_bilder.js`
