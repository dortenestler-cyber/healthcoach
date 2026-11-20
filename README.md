# Health Coach

Eine persönliche App für Training, Erholung und Perimenopause. Sie verbindet Garmin-Daten von der Fenix 9 Pro mit Tagebuch, Zyklus, Symptomen, Krankheiten, Verletzungen, Medikamenten und einem Coach auf Basis von Claude.

**Stand:** Phase 1, Fundament. Anmeldung mit Code per E-Mail, Morgen-Check-in, Hitzewallungen und Tagebuch speichern in Supabase. Die übrigen Reiter sind noch Platzhalter.

## Einrichtung Supabase (einmalig)
1. Im Supabase-Projekt den **SQL-Editor** öffnen, den Inhalt von `supabase/migrations/20261120120000_phase1_fundament.sql` einfügen und auf **Run** klicken.
2. Unter **Authentication → Emails → Templates** die Vorlage **Magic Link** öffnen und den Code einfügen, zum Beispiel: `Dein Code für Health Coach: {{ .Token }}`. So bekommst du einen 6-stelligen Code statt nur eines Links. Der Code funktioniert auch in der App auf dem Startbildschirm.
3. Nach deiner ersten Anmeldung unter **Authentication → Sign In / Providers** die Option **Allow new users to sign up** ausschalten. Dann kann sich niemand sonst ein Konto anlegen.

## Einrichtung Vercel (einmalig)
1. Auf vercel.com mit GitHub anmelden und das Repo `healthcoach` importieren.
2. Unter **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL`: die Project URL aus Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: der Publishable key aus Supabase
3. **Deploy** klicken. Jeder Merge auf `main` geht danach automatisch online.

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
components/     Navigation, Coach-Knopf, Anmeldung, Ansichten
lib/            Supabase-Verbindung, Datum, feste Listen
supabase/       Datenbank-Tabellen mit Zugriffsschutz
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
