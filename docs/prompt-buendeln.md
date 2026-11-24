# Prompt: Funktionen bündeln, Bereiche gemeinsam nutzen

Diesen Text an den Anfang einer neuen Sitzung stellen, wenn ein Baustein aus `docs/konzept-buendeln.md` umgesetzt werden soll.
Zweite Runde nach `docs/prompt-aufraeumen.md` (Seiten und Karten, erledigt am 22.11.).

```text
Bündle Funktionen in Health Coach zu gemeinsamen Bausteinen, die mehrere Bereiche nutzen.
Lies zuerst CLAUDE.md, docs/konzept-buendeln.md, docs/design-konzept-dunkel.md,
docs/prompt-designkonzept.md und die Übergabe deiner Rolle in docs/uebergabe/.

Baustein für diese Sitzung: <Nummer und Name aus dem Konzept, z. B. „5 Einordnung“>

SCHRITT 1 – Bestandsaufnahme (noch keinen Code ändern)
Liste jede Stelle, die heute dasselbe auf eigene Art macht:
Datei · Bereich · was sie zeigt oder speichert · Unterschiede (Wörter, Farben, Zeiträume,
Bedienung, Speichern/Löschen). Suche im ganzen Repo, nicht nur in den Dateien aus dem Konzept.
Markiere, was beim Zusammenlegen verloren ginge, und was nur an einer Stelle Sinn ergibt.

SCHRITT 2 – Vorschlag (mir vorlegen, dann warten)
Beschreibe den Baustein in wenigen Sätzen:
- Was er kann und welche Einstellungen ein Bereich mitgibt (Farbe, Voreinstellung, Inhalt)
- Wo er eingesetzt wird: vorher → nachher je Stelle
- Was du bewusst NICHT zusammenlegst und warum
- Ob Datenbank oder Supabase-Funktionen betroffen sind (dann Rolle Daten, meine Freigabe)
Regeln:
1. Ein Ding, ein Baustein, viele Orte. Der Bereich bestimmt den Inhalt, der Baustein Aussehen und Bedienung.
2. Navigation, Heute als ruhige Einstiegsseite und das Tagebuch als Zuhause fürs Eintragen bleiben.
3. Ein Zeitraum-Umschalter für die ganze App: 7 T · 30 T · 3 M · 6 M · 1 J.
4. Einordnungen immer als Wort + Farbe + Satz, Farbe nie allein, keine Ampel für Erholung,
   innerhalb einer Familie „mehr ist heller“, Amber nur als Hinweis.
5. Zusammenhänge immer mit Belegzahl, nie als Ursache, keine Diagnose.
6. Tippen auf ein Datum führt überall zum selben Ziel (Tagesblatt).
7. Keine Funktion streichen, ohne mich zu fragen. Keine neuen Funktionen nebenbei.

SCHRITT 3 – Umsetzung (erst nach meiner Freigabe)
- Zweig und Entwurfs-PR mit Rollenkürzel als Anmeldung, Belegt-Zeile setzen (docs/konzept-zwei-instanzen.md).
- Erst den Baustein in components/ui oder components/charts bauen, dann die Stellen einzeln umstellen.
  Alte Komponenten löschen, sobald nichts mehr sie nutzt. Keine Kopien.
- Alte Adressen per Weiterleitung erhalten.
- Farben und Abstände nur aus app/globals.css, Tap-Ziele ≥ 44 px, Kontrast AA,
  kein waagerechtes Scrollen bei 390 px. Die App ist immer dunkel.
- Rechnungen in lib/, ohne Netzwerk, damit sie sich prüfen lassen.
- Jeden Schritt committen und pushen, Übergabe nachführen.

Abnahme je Pull Request:
- Bildschirmfotos vorher/nachher bei 390 × 844 und am Computer (1280 breit),
  mit Beispieldaten, als solche gekennzeichnet. Testseiten danach wieder löschen.
- Liste: welche Stellen den Baustein jetzt nutzen, was gelöscht wurde, was bewusst bleibt
- tsc und npm run build fehlerfrei
- docs/konzept-buendeln.md: Baustein als erledigt markieren, Entscheidungen ins Logbuch
```
