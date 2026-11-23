# Konzept · Health Coach im Browser am Computer

Stand: 23.11.2026 · Rolle Oberfläche `[OF]` · zur Sichtung, noch nicht freigegeben
Entwurf mit Beispieldaten: `docs/bilder/entwuerfe/web-heute.png`

## Ausgangslage

- Die App ist nur fürs iPhone gebaut. Im Browser steht eine 480 px schmale Spalte in der Mitte, links und rechts bleibt alles leer (`.shell` in `app/globals.css`, keine einzige Regel für breite Bildschirme).
- Die Ringe sind auch am Computer angeschnitten, unten steht die iPhone-Leiste, der Coach schwebt über dem Inhalt.
- „Nach unten ziehen zum Aktualisieren“ geht mit der Maus nicht.
- Nach dem Login fragt die App zusätzlich die PIN ab, beim Öffnen und nach 5 Minuten im Hintergrund.

## Ziel

Am Computer nutzt Health Coach die Breite: Man sieht mehr auf einmal, ohne dass es unruhig wird. Am iPhone bleibt alles, wie es ist. Inhalte, Farben, Texte und Regeln sind auf beiden Geräten gleich, nur die Anordnung ändert sich.

## 1. Anmeldung und PIN

| | iPhone (App auf dem Home-Bildschirm) | Browser am Computer |
|---|---|---|
| Anmeldung | einmal mit E-Mail und Passwort, bleibt bestehen | einmal mit E-Mail und Passwort, bleibt bestehen |
| PIN / Face ID | wie bisher | **keine PIN** |
| Abmelden | Einstellungen | Einstellungen und unten in der Seitenleiste |

- **Keine PIN im Browser:** Die PIN-Sperre gilt nur noch, wenn die App vom Home-Bildschirm gestartet ist (eigenes Fenster, `display-mode: standalone`). Im normalen Browser-Tab entfällt sie. In den Einstellungen bleibt ein Schalter „PIN auch im Browser“ für später, standardmäßig aus.
- **Angemeldet bleiben:** Die Anmeldung bleibt im Browser gespeichert und wird im Hintergrund erneuert. Man muss sich erst wieder anmelden, wenn man sich selbst abmeldet oder die Browserdaten löscht.
- **Anmeldedaten vorausgefüllt:** Die E-Mail-Adresse bleibt nach dem Abmelden im Feld stehen (nur auf diesem Gerät gespeichert). Das Passwort füllt der Passwort-Manager des Browsers bzw. der iCloud-Schlüsselbund aus. Die Felder sind dafür richtig gekennzeichnet. Das Passwort speichert die App selbst nie.
- **Hinweis zur Sicherheit:** Ohne PIN kann jeder, der an deinem Computer sitzt, die App offen sehen. Das ist in Ordnung, solange es dein eigener Computer mit Bildschirmsperre ist.

Zu klären: Meinst du mit „Daten sollen vorerfasst stehen bleiben“ die Anmeldedaten (so oben beschrieben) oder auch etwas anderes, z. B. halb ausgefüllte Eingaben im Tagebuch? Die könnte die App als Entwurf auf dem Gerät behalten, bis du speicherst.

## 2. Aufbau nach Bildschirmbreite

| Breite | Gerät | Navigation | Inhalt | Coach |
|---|---|---|---|---|
| bis 767 px | iPhone | Leiste unten (wie heute) | eine Spalte | schwebender Knopf |
| 768–1199 px | iPad, kleines Fenster | schmale Seitenleiste links, nur Symbole | zwei Spalten | schwebender Knopf, öffnet Seitenfenster |
| ab 1200 px | Computer | Seitenleiste links mit Namen | zwei Spalten, höchstens 1180 px breit | eigene Spalte rechts, ein- und ausklappbar |

**Seitenleiste:** App-Symbol und „Health Coach“ oben. Darunter Heute · Tagebuch · Training · Zyklus · Gesundheit, die aktive Seite hell hinterlegt. Unten Einstellungen, der Garmin-Stand als Punkt (Sammelliste Punkt 7) und Abmelden.

**Coach rechts:** Am Computer ist der Coach eine feste Spalte (360 px) neben dem Inhalt statt einer eigenen Seite. So kannst du fragen und gleichzeitig die Werte sehen. Ein Knopf klappt die Spalte zu, die Einstellung merkt sich der Browser. Ist der Coach ausgeschaltet, fehlt die Spalte.

**Farbverlauf im Seitenkopf:** Der Verlauf in der Bereichsfarbe bleibt, läuft aber nur über den Inhaltsbereich und wird nach unten schneller dunkel. Auf dem großen Bildschirm wirkt er sonst wie eine grüne Fläche.

## 3. Die Seiten am Computer

**Heute** (siehe Entwurf)
- Kopf: Gruß und Datum mit ‹ ›, rechts ein Knopf „Aktualisieren“ statt Ziehen. Tastatur: ← → wechselt den Tag.
- Oben über die volle Breite: alle fünf Ringe nebeneinander, nicht angeschnitten. Darunter der Satz zum Tag.
- Linke Spalte: Auf einen Blick (vier Kacheln in einer Reihe oder 2 × 2), Letzte Aktivitäten.
- Rechte Spalte: Heute steht an (Training, Medikamente eingeklappt wenn erledigt, Check-in).

**Detailseiten der Ringe** (`/heute/…`): Kurve groß links, Faktoren rechts daneben. Zeitraum wählbar 7 · 30 · 90 Tage, am Computer standardmäßig 30.

**Tagebuch:** links das Erfassen (Check-in, Blutung, Symptome, Gewohnheiten, Medikamente), rechts der Verlauf über 4 Wochen offen statt eingeklappt.

**Training:** links Kalender als ganzer Monat, rechts Wochenplan und Auswertung.

**Zyklus:** links Ring mit Phasen und Kalender, rechts „Was in dieser Phase üblich ist“, Werte und Symptome nach Zyklustag.

**Gesundheit:** Die Reiter bleiben. Im Überblick zwei Spalten, Medikamente als Liste links und Details zum gewählten Mittel rechts.

**Einstellungen:** eine Spalte, höchstens 640 px breit. Formulare werden nicht breiter, sonst lesen sie sich schlecht.

## 4. Bedienung mit Maus und Tastatur

- **Charts:** Mit der Maus über den Chart fahren zeigt Datum und Wert (Sammelliste Punkt 9). Phasen in der Leiste darunter (Punkt 8).
- **Hover:** Karten und Zeilen, die zu einer Detailseite führen, werden beim Überfahren leicht heller. Der Mauszeiger wird zur Hand.
- **Fokus:** Sichtbarer heller Rahmen bei Tab-Bedienung auf allen Knöpfen.
- **Kürzel:** ← → Tag wechseln (Heute), `/` springt ins Coach-Eingabefeld, `Esc` schließt Fenster und den Coach.
- **Aktualisieren:** Knopf statt Ziehen. Am iPhone bleibt das Ziehen.

## 5. Was gleich bleibt

- Immer dunkel, Farbsystem „Nacht“, Schrift, Radien, Ringe.
- Alle Texte, Regeln zu Gesundheit und Sicherheit, Datenschutz.
- Keine neuen Daten, keine Änderung an der Datenbank. Alles ist reine Oberfläche `[OF]`.

## 6. Umsetzung in Schritten

1. **Anmeldung:** PIN nur in der installierten App, E-Mail merken, Abmelden in der Seitenleiste. (`components/AuthGate.tsx`, `components/PinLock.tsx`, `lib/pin.ts`)
2. **Grundgerüst:** Breakpoints in `app/globals.css`, Seitenleiste statt Leiste unten (`components/TabBar.tsx` → wird je nach Breite Leiste oder Seitenleiste), Inhaltsbreite, Seitenkopf-Verlauf.
3. **Coach-Spalte** am Computer (`components/CoachView.tsx` als Spalte nutzbar, `components/CoachButton.tsx`).
4. **Heute** zweispaltig, Ringe ohne Anschnitt, Knopf Aktualisieren, Tastatur.
5. **Weitere Seiten** zweispaltig: Detailseiten, Tagebuch, Training, Zyklus, Gesundheit.
6. **Feinschliff:** Hover, Fokus, Kürzel, Bildschirmfotos zum Vergleich bei 390, 1024 und 1440 px.

Schritte 1 und 2 gehen zuerst, danach ist die App am Computer schon gut benutzbar. Jeder Schritt bekommt Bildschirmfotos mit Beispieldaten zur Kontrolle. Das iPhone wird bei jedem Schritt mitgeprüft, damit dort nichts verrutscht.

## Fragen an dich

1. Coach am Computer als feste Spalte rechts, oder lieber wie am iPhone als eigene Seite?
2. „Vorerfasst stehen bleiben“: nur Anmeldedaten, oder auch halb ausgefüllte Eingaben (siehe Abschnitt 1)?
3. Soll das iPad wie der Computer funktionieren (ohne PIN im Browser), oder wie das iPhone?
