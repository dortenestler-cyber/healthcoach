# Store-Eintrag: Zifferblatt

Texte zum Einfügen im Garmin-Entwicklerportal (apps.garmin.com/developer/upload). Bilder liegen in diesem Ordner, die Datei `HealthCoachFace.iq` baut der Lauf „Uhr-App bauen“.

## Name
Health Coach Datenraster

## Typ
Zifferblatt (Watch Face)

## Kurzbeschreibung
Digitales Zifferblatt im Stil einer LCD-Uhr, verbunden mit der App Health Coach.

## Beschreibung
Dunkles, digitales Zifferblatt mit Segmentziffern und schwach sichtbaren Geisterziffern. Es zeigt Werte aus Garmin und aus der App Health Coach: Tagesziel, Body Battery, Puls, nächste Einheit, Bufori-Hübe, Sonnenzeiten und mehr.

Zwei Layouts:
- A · Ruhiges Raster: Datum, Sonnenzeiten mit Wetter, Uhrzeit mit Sekunden, zwei Zeilen mit je drei Werten, Strich-Anzeigen links und rechts
- C · Werte am Rand: vier Werte stehen schräg am Rand, in der Mitte Datum, Wetter, Uhrzeit und vier Werte

Einstellungen in Garmin Connect:
- Layout
- Wert für jedes Feld
- Farbmodus: Einfarbig, Bedeutung (jeder Wert in der Farbe seiner Familie) oder Nacht
- Nacht automatisch zur Schlafenszeit
- Ort für die Sonnenzeiten, falls die Uhr keine Position kennt

„Immer an“ zeigt die Uhrzeit dünn und gedimmt, wandernd gegen Einbrennen.

Für die Werte aus Health Coach braucht das Zifferblatt den Uhr-Schlüssel aus der App (Einstellung „Uhr-Schlüssel“). Die Screenshots zeigen Beispieldaten.

## Neu in dieser Version
Größere Werte, zwei Layouts (A Ruhiges Raster, C Werte am Rand), Wochentag im Datum, neues Symbol für die Sonnenzeiten. Sonnenzeiten erscheinen jetzt auch, wenn Wetter und Aktivität keine Position liefern (letzte GPS-Position oder Ort aus den Einstellungen). Die Layouts Monolith, Zyklus-Spur, Stapel und Eine Zeile sind nicht mehr enthalten.

## Bilder
- Store-Icon: `store-icon-500.png` (500 × 500)
- Screenshots in dieser Reihenfolge:
  1. `1-layout-a.jpg`: Layout A, Einfarbig
  2. `2-layout-a-bedeutung.jpg`: Layout A, Farbmodus Bedeutung
  3. `3-layout-c.jpg`: Layout C, Einfarbig
  4. `4-layout-c-bedeutung.jpg`: Layout C, Farbmodus Bedeutung
  5. `5-immer-an.jpg`: Anzeige „Immer an“

Neu erzeugen: `node watchface/tools/store_bilder.js`
