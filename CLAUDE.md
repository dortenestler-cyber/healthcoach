# Health Coach · Regeln für Claude

Health Coach bringt Training, Erholung, Zyklus, Perimenopause-Symptome, Krankheiten, Verletzungen und Medikamente in einer App zusammen. Die App ist für eine Person gebaut.

## Arbeitsweise
- Änderungswünsche erst sammeln und erst nach Freigabe umsetzen. Bugs sofort beheben.
- Vor einem Umbau kurz beschreiben, wie du es lösen würdest.
- Änderungen immer über einen eigenen Zweig und einen Pull Request, nie direkt auf `main`.
- Eigene Pull Requests selbst mergen, wenn `tsc` und `npm run build` fehlerfrei sind und es keine Konflikte gibt. Bei Änderungen an der Datenbank (Migrationen) oder an Supabase-Funktionen auf Freigabe warten.
- Antworten und Texte in der App auf Deutsch, klar und knapp, ohne Fachjargon.
- Beispieldaten immer als solche kennzeichnen.
- Was die Nutzerin selbst tun muss (Migrationen, Secrets, Einstellungen in Supabase oder GitHub), in `AUFGABEN.md` eintragen und Erledigtes abhaken.

## Begriffe
- Immer „Kettlebell“, nie „Glocke“.
- Die App heißt „Health Coach“.

## Design
- Dunkel ist der Standard, angelehnt an Whoop und Bevel: dunkelgraue Karten `#15181D` auf `#0B0D10`, Flächen `#262B33`, Text `#F2F4F7`, gedämpft `#9AA3AE`. Radius 24 (Kacheln 18), große Zahlen, Schrift Inter mit Ziffern in gleicher Breite. Konzept: `docs/design-konzept-dunkel.md`.
- Hell bleibt wählbar (Einstellungen › Darstellung): weiße Karten auf `#F2F2F7` wie Apple Health.
- Ringe für Schlaf, Readiness und Belastung gehören zum Stil. Ein Ring steht nie ohne Zahl und Wort.
- Farben haben eine feste Bedeutung und stehen nie allein, immer mit Text. Keine Ampelfarben für die Erholung.
  Dunkel: Erholung/Readiness Sage `#52B788` · Zyklus/Perimenopause Terracotta `#E8845A` · Menstruation `#F28B8B` auf `#3B1E22` · Training/Garmin Slate-Blau `#7C9AE0` · Symptome/Warnung Amber `#F0A24A` · Mobility Violett `#A98BE0` · Schlaf neutral `#E5E7EB`.
  Hell: Sage `#2D6A4F` · Terracotta `#B4491F` · Menstruation `#7F1D1D` auf `#F6DADA` · Slate-Blau `#3B5998` · Amber `#B45309` · Violett `#6D4AA8`.
- Hauptbutton, aktive Auswahl und Links: hell auf dunkel (`#F2F4F7`), im hellen Design `#1C1C1E`.
- Beere `#A3234F` ist nur noch Markenfarbe: App-Symbol und Coach-Knopf.
- Jedes Diagramm bekommt eine Überschrift mit einem Satz, der das Ergebnis nennt.
- Farben und Abstände kommen aus den Variablen in `app/globals.css`, keine festen Farbwerte in Komponenten.
- Tap-Ziele mindestens 44 px, Kontrast mindestens AA.
- Navigation: Heute, Tagebuch, Training, Muster, Gesundheit. Der Coach ist ein schwebender Knopf auf jeder Seite.
- App-Symbol: Tagesziel-Ring, hell (`public/icons/icon.svg`) und dunkel (`public/icons/icon-dark.svg`).

## Gesundheit und Sicherheit
- Keine Diagnosen, keine Dosierungsvorschläge. Mengen von Medikamenten trägt die Nutzerin selbst ein.
- Hinweise zu Medikamenten nur mit Quelle (Fachinformation oder Gebrauchsinformation).
- Bei Warnzeichen auf ärztliche Abklärung verweisen.
- Kein Arztbericht, keine Fragebögen, keine Laborwerte in der App.
- Gewicht nur als Trend, ohne Zielgewicht und ohne Abnehm-Funktion.

## Daten und Schlüssel
- Supabase in der Region EU (Frankfurt), Zugriffsschutz pro Konto (Row Level Security) auf jeder Tabelle.
- Geheime Schlüssel (Claude-API, Garmin, Service-Role) nur in den Supabase-Secrets, nie im Repo und nie im Browser.
- An die Claude-API geht nur, was eine Antwort wirklich braucht.

## Fahrplan
Phase 0 Grundgerüst · 1 Fundament (Login, Tagebuch, Check-in) · 2 Garmin-Daten · 3 Training und Gesundheit · 4 Auswertung und Coach · 5 Uhr (Connect IQ) · 6 Alltagstest.
