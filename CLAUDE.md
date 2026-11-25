# Health Coach · Regeln für Claude

Health Coach bringt Training, Erholung, Zyklus, Perimenopause-Symptome, Krankheiten, Verletzungen und Medikamente in einer App zusammen. Die App ist für eine Person gebaut.

## Arbeitsweise
- Änderungswünsche erst sammeln und erst nach Freigabe umsetzen. Bugs sofort beheben.
- Vor einem Umbau kurz beschreiben, wie du es lösen würdest.
- Änderungen immer über einen eigenen Zweig und einen Pull Request, nie direkt auf `main`.
- Vercel läuft im kostenlosen Hobby-Tarif (höchstens 100 Deployments am Tag, Vorschauen zählen mit). Nur `main` geht online, andere Zweige bauen nicht (`vercel.json`). Eine Vorschau gibt es nur auf Wunsch der Nutzerin über einen Zweig `vorschau/…`. Änderungen bündeln: wenige Pushes, ein Pull Request, ein Merge. Zeitpläne laufen in Supabase (pg_cron), nicht als Vercel-Cron.
- Eigene Pull Requests selbst mergen, wenn `tsc` und `npm run build` fehlerfrei sind und es keine Konflikte gibt. Bei Änderungen an der Datenbank (Migrationen) oder an Supabase-Funktionen auf Freigabe warten.
- Antworten und Texte in der App auf Deutsch, klar und knapp, ohne Fachjargon.
- Keine Hinweis- und Erklärtexte in der App: keine Untertitel unter Seitentiteln, keine Bedienhinweise, Rechenwege, Legenden-Sätze oder „keine Diagnose“-Sätze. Die Nutzerin hat die App gebaut und kennt sie. Erlaubt bleiben Leerzustände, Warnzeichen mit Verweis auf ärztliche Abklärung, Quellen bei Medikamenten und die Kennzeichnung von Beispieldaten.
- Beispieldaten immer als solche kennzeichnen.
- Was die Nutzerin selbst tun muss (Migrationen, Secrets, Einstellungen in Supabase oder GitHub), in `AUFGABEN.md` eintragen und Erledigtes abhaken.
- Uhr-App und Zifferblätter installiert die Nutzerin nur über das Garmin-Entwicklerportal (apps.garmin.com/developer/upload), nicht per USB. Jede Änderung an `watch/` oder `watchface/` liefert ein fertiges Upload-Paket: `.iq`, Store-Icon 500 × 500 und aussagekräftige Screenshots (JPG unter 150 KB) sowie den Beschreibungstext, gebaut vom Lauf „Uhr-App bauen“.

## Zwei Instanzen
Zwei Claude-Instanzen arbeiten parallel, Regeln in `docs/konzept-zwei-instanzen.md`.
- Rollen: **Oberfläche** `[OF]` (`app/`, `components/`, `public/`, `globals.css`) und **Daten** `[DA]` (`supabase/`, `watch/`, `watchface/`, `.github/`). Migrationen schreibt nur Daten.
- Start: `CLAUDE.md`, eigene Übergabe in `docs/uebergabe/`, die der anderen Rolle, `docs/uebergabe/entscheidungen.md`, offene PRs der eigenen Rolle lesen.
- Neue Aufgabe: zuerst Zweig und Entwurfs-PR mit Kürzel im Titel, das ist die Anmeldung.
- Unterwegs: jeden Schritt committen und sofort pushen. Entscheidungen der Nutzerin sofort ins Logbuch.
- Ende: Übergabe-Datei aktualisieren (Stand, nächster Schritt, Wartet auf), alles pushen, `git status` leer.
- Verbindlich ist nur, was im Repo steht, nicht Nachrichten zwischen den Instanzen.
- Mehrere Claude-Konten: jedes darf jede Rolle übernehmen (z. B. bei Limit), immer nur eine Sitzung pro Rolle. Zweite Zeile der Übergabe ist die Belegt-Zeile: beim Start prüfen und setzen, unterwegs Übergabe nach jedem Schritt pushen, am Ende `Belegt: frei`. Regeln: `docs/konzept-zwei-instanzen.md`, Abschnitt 11.

## Begriffe
- Immer „Kettlebell“, nie „Glocke“.
- Die App heißt „Health Coach“.

## Design
- Die App ist immer dunkel, auf dem iPhone und im Browser. Es gibt kein helles Design. Angelehnt an Whoop und Bevel: dunkelgraue Karten `#15181D` auf `#0B0D10`, Kachel in Karte `#1C2026`, Flächen `#262B33`, Text `#F2F4F7`, gedämpft `#9AA3AE`. Radius 24 (Kacheln 18), große Zahlen, Schrift Inter mit Ziffern in gleicher Breite. Farbsystem „Nacht“: `docs/farb-und-designkonzept.md`.
- Ringe für Schlaf, Readiness, Belastung, Energie und Stress gehören zum Stil, dezent mit schmalem Strich. Ein Ring steht nie ohne Zahl und Wort.
- Sechs Farbfamilien mit fester Bedeutung. Innerhalb einer Familie gilt: mehr ist heller (Stress, Pulszonen, Readiness-Stufen).
- Farben haben eine feste Bedeutung und stehen nie allein, immer mit Text. Keine Ampelfarben für die Erholung.
  Erholung/Readiness Sage `#52B788`, Energie Sage hell `#8FD5B0` · Zyklus/Perimenopause Terracotta `#E8845A` · Menstruation `#F28B8B` auf `#3B1E22` · Training/Garmin Slate-Blau `#7C9AE0` · Symptome/Warnung Amber `#F0A24A` · Mobility Violett `#A98BE0` · Stress Türkis `#45C4C0` (höher = heller, nie roter) · Schlaf neutral `#E5E7EB`.
- Seitenkopf mit Farbverlauf in der Bereichsfarbe (`PageHead tone`): Heute Sage, Zyklus Terracotta, Training Slate-Blau, Gesundheit Graphit. Tagebuch ohne.
- Sportfarben bleiben in der Familie Slate-Blau, Ausdauer sehr hell. Türkis gehört nur zu Stress.
- Konzept „dunkel 2“ mit Vorlagen: `docs/design-konzept-dunkel.md`, `docs/bilder/vorlagen/`. Vor jedem Umbau eines Bildschirms den Prompt in `docs/prompt-designkonzept.md` befolgen.
- Hauptbutton, aktive Auswahl und Links: hell auf dunkel (`#F2F4F7`).
- Beere `#A3234F` ist Markenfarbe: Coach-Knopf und das Ende des Rand-Verlaufs der Erklärkarte (`#E0527F`).
- Jedes Diagramm bekommt eine Überschrift mit einem Satz, der das Ergebnis nennt.
- Farben und Abstände kommen aus den Variablen in `app/globals.css`, keine festen Farbwerte in Komponenten.
- Tap-Ziele mindestens 44 px, Kontrast mindestens AA.
- Navigation: Heute, Tagebuch, Training, Zyklus, Gesundheit. Auf dem iPhone Leiste unten und der Coach als schwebender Knopf; am Computer und iPad Seitenleiste links und der Coach als Spalte rechts (`docs/konzept-web-app.md`). PIN nur auf dem iPhone.
- Heute ist eine ruhige Einstiegsseite (`docs/konzept-heute-einstieg.md`): Gruß und Datum mit ‹ ›, Ringe „Dein Tag“ als Rondell (Zyklus, Energie, Schlaf, Readiness in der Mitte, Belastung, Intensität, Stress), ein Satz zum Ring in der Mitte, Kacheln „Auf einen Blick“ (HRV, Ruhepuls, Schlafbedarf), Heute steht an, Letzte Aktivitäten. Jeder Ring öffnet eine Detailseite (`/heute/…`), dort stehen Kurven und Faktoren, auch „Energie über den Tag“. Aktualisieren durch Ziehen nach unten.
- Die Seite Zyklus stellt den Zyklus in den Mittelpunkt: Ring mit Phasen, was in der heutigen Phase üblich ist, Werte und Symptome nach Zyklustag, Gewohnheiten je Phase.
- Gesundheit hat die Reiter Überblick · Medikamente · Krank & verletzt · Körper. Der Überblick zeigt heute auf einen Blick, was dir guttut (mit Wegen zu jeder Gewohnheit), „Dein Monat“ (nur deutlich Verändertes) und die Muster ohne Zyklusbezug („Weitere Muster“).
- Gewohnheiten (früher „Einflüsse“) werden im Tagebuch per Tipp erfasst, Details nur wo nötig (Sauna: Gänge, Wann, Kältebecken). Liste und eigene Gewohnheiten unter Einstellungen › Gewohnheiten. Jede Gewohnheit hat eine Detailseite unter Gesundheit.
- App-Symbol: Blatt mit Puls – Blatt (Erholung, Zyklus) mit einem Herzschlag als Mittelrippe, Sage (`#8FD5B0`, Puls `#D2F1E0`) auf dunklem Grüngrau, hell genug für getönte Symbole in iOS (`public/icons/icon.svg`, `public/icons/icon-dark.svg`, PNG-Größen daneben, ohne Kachel `public/icons/mark.svg`).

## Gesundheit und Sicherheit
- Keine Diagnosen, keine Dosierungsvorschläge. Mengen von Medikamenten trägt die Nutzerin selbst ein.
- Hinweise zu Medikamenten nur mit Quelle (Fachinformation oder Gebrauchsinformation).
- Bei Warnzeichen auf ärztliche Abklärung verweisen.
- Kein Arztbericht, keine Fragebögen, keine Laborwerte in der App.
- Gewicht nur als Trend, ohne Zielgewicht und ohne Abnehm-Funktion.

## Daten und Schlüssel
- Supabase in der Region EU (Irland, `eu-west-1`), Zugriffsschutz pro Konto (Row Level Security) auf jeder Tabelle.
- Geheime Schlüssel (Claude-API, Garmin, Service-Role) nur in den Supabase-Secrets, nie im Repo und nie im Browser.
- An die Claude-API geht nur, was eine Antwort wirklich braucht.

## Fahrplan
Phase 0 Grundgerüst · 1 Fundament (Login, Tagebuch, Check-in) · 2 Garmin-Daten · 3 Training und Gesundheit · 4 Auswertung und Coach · 5 Uhr (Connect IQ) · 6 Alltagstest.
