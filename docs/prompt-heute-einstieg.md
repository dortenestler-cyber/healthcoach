# Prompt: Heute als aufgeräumte Einstiegsseite

Selbst geschrieben am 23.11.2026 für das Konzept `docs/konzept-heute-einstieg.md`. Gilt zusätzlich zu `docs/prompt-designkonzept.md`.

```text
Entwirf die Seite „Heute“ neu als ruhige Einstiegsseite. Vorlagen: die neun Bildschirme
vom 23.11.2026 (Whoop: Stress, Zyklus, Logbuch, Coach, Erholung, Schlaf · Bevel: Belastung ·
Sonar: Startseite) und docs/bilder/vorlagen/01–16.

Ziel: In 5 Sekunden weiß die Nutzerin, wie es ihr geht und was heute ansteht.
Alles Weitere liegt eine Ebene tiefer, einen Tipp entfernt.

Aufbau 1:1 nach Sonar (letzter Screenshot), von oben nach unten:
  1. Gruß + Datum mit ‹ › zum Blättern
  2. „Dein Tag“: Reihe runder Ringe, Wort ÜBER dem Ring, Zahl + Einheit IM Ring,
     mittlerer Ring größer, seitlich wischbar, angeschnittene Ringe am Rand zeigen: da ist mehr
  3. „Auf einen Blick“: 2 × 2 Kacheln, links ein Symbol im abgerundeten Feld,
     rechts Name und Wert, Stift zum Anpassen
  4. „Letzte Aktivitäten“: Liste mit Symbol, Name, Dauer · Werte
Dazwischen genau EINE Erklärkarte (Whoop: Rahmen mit Verlauf, Satz, „Mehr dazu im Coach →“).

Detailseiten (ein Tipp auf einen Ring) 1:1 nach Whoop:
  Erholung/Readiness: großer Ring, darunter Kennzahlen-Liste mit Pfeil gegen 30 Tage, Legende, Erklärkarte
  Schlaf: großer Ring, Liste mit 3-Stufen-Balken je Faktor, Legende, Erklärkarte
  Belastung: Halbbogen mit Zielbereich (Bevel), zwei Kacheln, Erklärkarte mit Tipp
  Stress: Halbbogen 0–3, Tagesverlauf mit Schlaf und Training, Satz zur längsten Phase

Regeln:
1. Bündeln statt stapeln: Heute hat höchstens 5 Abschnitte. Jeder Wert erscheint auf Heute
   genau einmal. Was zweimal vorkommt, fliegt aus der Übersicht in die Detailseite.
2. Jeder Ring: Wort darüber, Zahl darin, Zustand darunter (z. B. „Bereit“, „im Ziel“).
   Kein Ring ohne Zahl und Wort. Kein Ring ohne Ziel per Tipp.
3. Farben nur mit fester Bedeutung (CLAUDE.md): Sage Erholung, Slate-Blau Training,
   Türkis Stress (höher = heller), Schlaf neutral, Terracotta Zyklus, Amber Hinweis.
   Keine Ampel: Die 3-Stufen-Balken der Schlaf-Vorlage werden einfarbig, die Stufe steht als Wort.
4. Übernimm nicht: Markennamen, Bild-Hintergrund (Sonar), Kalorien und Schritte als Ziel,
   „Top x %“, Alter, Blutzucker, Bettzeit, Neon.
5. Texte Deutsch, kurz, Zusammenhänge statt Ursachen, keine Diagnose. Beispieldaten kennzeichnen.
6. Tap-Ziele ≥ 44 px, Kontrast AA, 390 px ohne waagerechtes Scrollen der Seite
   (die Ringreihe scrollt in sich).
7. Erst Konzept und Entwurf zur Sichtung, Code erst nach Freigabe.

Abgabe:
- Entwurf als Seite mit Telefon-Rahmen 390 × 844, immer dunkel,
  Ringe antippbar, Detailseiten erreichbar.
- Zu jeder Grafik: was sie zeigt, woher die Zahl kommt, was ein Tipp öffnet.
- Tabelle Vorlage → übernommen / abgewandelt / weggelassen, mit Grund.
- Liste: was von der heutigen Seite wohin wandert, nichts geht verloren.
- Offene Fragen an die Nutzerin am Ende, höchstens fünf.
```
