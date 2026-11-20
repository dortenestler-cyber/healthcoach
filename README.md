# Health Coach

Eine persönliche App für Training, Erholung und Perimenopause. Sie verbindet Garmin-Daten von der Fenix 9 Pro mit Tagebuch, Zyklus, Symptomen, Krankheiten, Verletzungen, Medikamenten und einem Coach auf Basis von Claude.

**Stand:** Phase 0, Grundgerüst. Die fünf Reiter und der Coach-Knopf sind angelegt, aber noch ohne Daten.

## Technik
- **Web-App** mit [Next.js](https://nextjs.org), lässt sich wie eine App auf den Startbildschirm legen
- **Supabase** (ab Phase 1): Datenbank, Login und Hintergrundfunktionen, Region EU (Frankfurt)
- **Garmin Personal API** (ab Phase 2): holt die eigenen Garmin-Daten ab
- **Claude-API** (ab Phase 4): Coach und Auswertungen, nur über das Backend
- **Connect IQ** (ab Phase 5): Zifferblatt und Uhr-App für die Fenix 9 Pro

## Lokal starten
Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
cp .env.example .env.local   # ab Phase 1 Supabase-Werte eintragen
npm run dev
```

Dann im Browser `http://localhost:3000` öffnen.

## Aufbau
```
app/            Seiten: Heute, Tagebuch, Training, Muster, Gesundheit, Coach
components/     Navigation, Coach-Knopf, Seitenkopf
public/icons/   App-Symbol hell und dunkel
CLAUDE.md       Regeln für die Arbeit mit Claude
```

## App-Symbol
Der Tagesziel-Ring in Beere `#A3234F`. Im Repo liegen eine helle und eine dunkle Version. iOS zeigt bei Web-Apps auf dem Startbildschirm nur die helle Version. Die dunkle Version (`icon-dark-1024.png`) ist für eine spätere App im App Store vorbereitet.

## Fahrplan
| Phase | Inhalt |
|---|---|
| 0 | Grundgerüst, Design, App-Symbol, automatische Prüfung |
| 1 | Supabase, Login, Tagebuch, Morgen-Check-in |
| 2 | Garmin-Daten: Schlaf, HRV, Body Battery, Aktivitäten |
| 3 | Training (Kalender, Kettlebell-Pläne) und Gesundheit (Krankheiten, Verletzungen, Medikamente, Körperwerte) |
| 4 | Muster, Tagesziel und Coach |
| 5 | Uhr-App für die Fenix 9 Pro |
| 6 | Alltagstest |

Der ausführliche Baufahrplan und der Klick-Dummy liegen in Claude.
