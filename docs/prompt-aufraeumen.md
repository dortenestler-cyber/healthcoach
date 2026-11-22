# Prompt: App aufräumen und Funktionen bündeln

Diesen Text an den Anfang einer neuen Sitzung stellen, wenn Health Coach übersichtlicher werden soll.
Das Ergebnis der ersten Runde steht in `docs/aufraeumen-vorschlag.md`.

```text
Mach Health Coach übersichtlicher und aufgeräumter und bündle Funktionen sinnvoll.
Lies zuerst CLAUDE.md, docs/design-konzept-dunkel.md und docs/prompt-designkonzept.md.

SCHRITT 1 – Bestandsaufnahme (noch keinen Code ändern)
Erstelle eine Tabelle aller Seiten und Karten mit: Pfad · was sie zeigt · wo sie verlinkt ist ·
wie oft ich sie öffne (Daten aus Einstellungen › Nutzung, falls vorhanden).
Dazu gehören die fünf Hauptbereiche (Heute, Tagebuch, Training, Zyklus, Gesundheit) und die
Nebenseiten: /verlauf, /muster, /tagesziel, /begriffe, /uhr, /coach, /coach/hinweise und alle
Unterseiten von /einstellungen.
Markiere:
- Doppeltes: dieselbe Zahl oder dasselbe Diagramm an mehreren Stellen
- Versteckte Seiten: nur über Einstellungen erreichbar, obwohl sie Auswertung sind
  (z. B. Verlauf, Muster)
- Überladene Seiten: mehr als ca. 3 Bildschirmhöhen bei 390 × 844
- Tote Enden: Seiten ohne Weg zurück oder ohne Zusammenhang zum Bereich

SCHRITT 2 – Vorschlag (mir vorlegen, dann warten)
Schlage eine neue Gliederung vor, als Baum „Bereich › Reiter › Karte“. Regeln:
1. Die Navigation bleibt bei fünf Bereichen: Heute, Tagebuch, Training, Zyklus, Gesundheit.
   Der Coach bleibt ein schwebender Knopf.
2. Jede Funktion hat genau EIN Zuhause. An anderen Stellen nur eine kurze Zusammenfassung
   mit Link („Mehr ›“).
3. Heute beantwortet nur: Wie geht es mir, was steht heute an? Höchstens 5–6 Karten,
   die wichtigste oben. Alles Weitere per Link in den passenden Bereich.
4. Auswertung (Verlauf, Muster, Tagesziel) gehört zu dem Bereich, dessen Werte sie zeigt,
   nicht in die Einstellungen.
5. In den Einstellungen bleibt nur, was ich einmal einrichte: Konto, Darstellung, Funktionen,
   Gewohnheiten, Uhr, Daten & Backup, Einrichtungs-Check. In Gruppen mit Überschrift.
6. Auf jeder Seite gilt die gleiche Reihenfolge: Kopf mit Kernzahl → Erklärung in einem Satz
   → Details → Verlauf. Selten Genutztes klappt ein („Mehr anzeigen“).
7. Begriffe, Gewohnheiten, Zyklus und die Bereichsfarben bleiben so, wie CLAUDE.md sie festlegt.
   Keine neuen Funktionen, nichts streichen, ohne mich zu fragen.
Zeige für jede Änderung: vorher → nachher, Grund, und was ich dadurch weniger tippen
oder suchen muss. Nenne auch, was du bewusst NICHT änderst.

SCHRITT 3 – Umsetzung (erst nach meiner Freigabe)
- Ein Bereich pro Pull Request, in der Reihenfolge, die ich freigebe.
- Bausteine wiederverwenden (PageHead, Ring, Karten aus components/ui), keine Kopien.
  Komponenten, die nicht mehr gebraucht werden, entfernen.
- Alte Links per Weiterleitung erhalten (z. B. /verlauf → neues Zuhause), damit nichts ins Leere führt.
- Farben und Abstände nur aus app/globals.css, Tap-Ziele ≥ 44 px, Kontrast AA,
  kein waagerechtes Scrollen bei 390 px.
- Keine Änderungen an der Datenbank oder an Supabase-Funktionen ohne Freigabe.

Abnahme je Pull Request:
- Bildschirmfotos vorher/nachher bei 390 × 844, dunkel und hell
  (Beispieldaten, als solche gekennzeichnet)
- Liste der verschobenen, zusammengelegten und entfernten Elemente
- tsc und npm run build fehlerfrei
```
