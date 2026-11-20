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
- Hell und minimalistisch: heller Hintergrund, weiße Karten, Schrift Inter, eine Akzentfarbe Beere `#A3234F`.
- Farben und Abstände kommen aus den Variablen in `app/globals.css`.
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
