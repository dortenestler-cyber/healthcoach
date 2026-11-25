# Prompt: Einfach bedienen (dritte Runde)

Dritte Runde nach `docs/prompt-aufraeumen.md` und `docs/prompt-buendeln.md`. Freigegeben am 25.11.2026.
Ergebnis: `docs/konzept-einfach.md`, Bilder in `docs/bilder/einfach/`.

Entscheidungen vorab (Logbuch 25.11.): Der zentrale Kalender öffnet sich über das Datum auf Heute und ein Kalender-Symbol im Kopf jedes Bereichs, mit passender Ebene vorgewählt. Kein sechster Navigationspunkt. Pillen merken ihren Zustand.

```text
Prüfe Health Coach auf Einfachheit und Bedienbarkeit und entwirf ein Gesamtkonzept,
wie die App ruhiger, flacher und leichter zugänglich wird.
Lies zuerst CLAUDE.md, docs/design-konzept-dunkel.md, docs/prompt-designkonzept.md,
docs/konzept-heute-einstieg.md, docs/konzept-web-app.md, docs/aufraeumen-vorschlag.md,
docs/konzept-buendeln.md und die Übergabe deiner Rolle.
Dritte Runde nach „Aufräumen“ und „Bündeln“. Schau dir an, was dort schon entschieden wurde,
und stelle es nicht ohne Grund wieder in Frage.

Blickwinkel: Ich öffne die App morgens auf dem iPhone (390 × 844), mit einer Hand und wenig Zeit.
Jeder Befund wird danach bewertet, ob ich schneller finde, was ich suche, und ob ich weniger
nachdenken muss.

SCHRITT 1 – Prüfung (noch keinen Code ändern)
Starte die App mit Beispieldaten und mach von jeder Seite einen Screenshot, ganze Länge,
390 × 844. Miss und notiere je Seite:
a) Länge in Bildschirmhöhen und wie viele Karten und Abschnitte sie hat
b) Tiefe: wie viele Tipps von der Leiste bis zur Funktion (Ziel: höchstens 2)
c) Wo das Wichtigste steht: über oder unter dem ersten Bildschirm
d) Doppeltes: dieselbe Zahl, dasselbe Diagramm oder derselbe Kalender an mehreren Stellen
e) Verschachtelung: Reiter in Reitern, Karten in Karten, aufklappbare Teile in aufklappbaren Teilen
f) Bedienung: uneinheitliche Umschalter, Zeiträume, Filter, Zurück-Wege, Speichern/Löschen
g) Text: Fachwörter, zu lange Sätze, Erklärungen, die immer sichtbar sind, obwohl sie
   nur einmal gebraucht werden

Prüfe dabei ausdrücklich:
1. KALENDER: Finde jeden Kalender im Repo (u. a. components/kalender/Monatskalender.tsx,
   components/training/CalendarSection.tsx, components/zyklus/CycleCalendar.tsx,
   components/tag/TagTraining.tsx). Je Stelle: was er zeigt, wo er auf der Seite steht
   (in Bildschirmhöhen), was er kann, was ihn von den anderen unterscheidet.
2. AKTIVITÄTEN: Wo erscheinen Trainingseinheiten heute als Liste, wo fehlt eine vollständige,
   durchsuchbare Liste aller Aktivitäten?
3. ZUSATZINFOS: Welche Informationen sind dauerhaft sichtbar, würden aber als Pille zum
   Ein- und Ausblenden reichen (Faktoren, Erklärtexte, Vergleichswerte, Phasen, Symptome)?
4. EINSTIEGE: Welche Funktionen sind nur über Umwege erreichbar (Einstellungen, tiefe
   Unterseiten, Links weit unten)?

Ergebnis Schritt 1: eine Tabelle je Seite und eine Liste der 10 größten Hürden,
sortiert danach, wie sehr sie im Alltag stören, jeweils mit Screenshot-Verweis.

SCHRITT 2 – Konzept (mir vorlegen, dann warten)
Schreibe docs/konzept-einfach.md mit:
A) Leitregeln, z. B.:
   – Eine Seite beantwortet eine Frage. Das Wichtigste steht auf dem ersten Bildschirm.
   – Höchstens zwei Ebenen: Bereich › Detail. Keine Reiter in Reitern.
   – Ein Baustein je Aufgabe: ein Kalender, eine Liste, ein Filter, ein Zeitraum-Umschalter.
   – Zusatzinfos sind zuerst ausgeblendet und lassen sich per Pille einblenden; die Wahl wird gemerkt.
   – Fünf Bereiche und der Coach-Knopf bleiben, Heute bleibt ruhig.
B) Zentraler Kalender: Wo er lebt (eigene Seite, Kopf-Symbol in jedem Bereich oder Heute ›
   Datum), wie er aussieht und wie die Mehrfachauswahl funktioniert: Ebenen als Pillen
   (Training, Zyklus/Periode, Symptome, Gewohnheiten, Krank & verletzt, Medikamente,
   Schlaf) kombinierbar, Bereichsfarben mit Text oder Symbol, nie nur Farbe. Tippen auf einen
   Tag öffnet das Tagesblatt. Jeder Bereich öffnet ihn mit seiner Ebene vorgewählt.
   Was wird aus den bisherigen Kalendern (entfällt, wird Mini-Vorschau mit „Kalender ›“, bleibt)?
C) Aktivitätenliste am Ende von Training: alle Einheiten, neueste oben, gruppiert nach Woche
   oder Monat, Filter-Pillen nach Sportart, Suche, Tippen öffnet die Einheit.
D) Pillen-System: ein Baustein für Ein-/Ausblenden und Filter (Größe, Zustand an/aus,
   mindestens 44 px Tap-Ziel, hell auf dunkel für aktiv, Farben aus globals.css).
   Liste, wo Pillen eingesetzt werden und was sie ersetzen.
E) Neue Gliederung als Baum „Bereich › Abschnitt › Karte“, vorher → nachher je Seite,
   mit neuer Länge in Bildschirmhöhen.
F) Was bewusst NICHT geändert wird und warum.
G) Umsetzung in Paketen (je ein PR, kleinste sinnvolle Schritte, Reihenfolge nach Nutzen),
   mit Rolle (OF/DA) und Hinweis, ob Datenbank oder Supabase-Funktionen betroffen sind.
H) Zu jedem großen Umbau eine Skizze als HTML in docs/entwurf-*.html im Stil „Nacht“
   (Beispieldaten gekennzeichnet).

Regeln für das Konzept: CLAUDE.md gilt vollständig (dunkles Design, Farbfamilien,
Ring nie ohne Zahl und Wort, Diagramm-Überschrift mit Ergebnis-Satz, Kontrast AA,
keine Diagnosen). Texte deutsch, klar, ohne Fachjargon.
```
