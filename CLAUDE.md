# Health Coach · Regeln für Claude

Health Coach bringt Training, Erholung, Zyklus, Perimenopause-Symptome, Krankheiten, Verletzungen und Medikamente in einer App zusammen. Die App ist für eine Person gebaut.

## Arbeitsweise
- Änderungswünsche erst sammeln und erst nach Freigabe umsetzen. Bugs sofort beheben.
- Vor einem Umbau kurz beschreiben, wie du es lösen würdest.
- Änderungen immer über einen eigenen Zweig und einen Pull Request, nie direkt auf `main`.
- Antworten und Texte in der App auf Deutsch, klar und knapp, ohne Fachjargon.
- Beispieldaten immer als solche kennzeichnen.

## Begriffe
- Immer „Kettlebell“, nie „Glocke“.
- Die App heißt „Health Coach“.

## Design
- Stil angelehnt an Apple Health und Google Health: große weiße Karten auf `#F2F2F7`, Radius 24 (Kacheln 18), große Zahlen, Schrift Inter mit Ziffern in gleicher Breite.
- Farben haben eine feste Bedeutung und stehen nie allein, immer mit Text:
  Erholung/Readiness Sage `#2D6A4F` · Zyklus/Perimenopause Terracotta `#B4491F` · Menstruation `#7F1D1D` auf `#F6DADA` · Training/Garmin Slate-Blau `#3B5998` · Symptome/Warnung Amber `#B45309` · Mobility Violett `#6D4AA8`.
- Hauptbutton, aktive Auswahl und Links in Dunkel `#1C1C1E`.
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
