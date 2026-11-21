# Health Coach

Eine persönliche App für Training, Erholung und Perimenopause. Sie verbindet Garmin-Daten von der Fenix 9 Pro mit Tagebuch, Zyklus, Symptomen, Krankheiten, Verletzungen, Medikamenten und einem Coach auf Basis von Claude.

**Stand:** Phase 4, Auswertung und Coach. Alles aus Phase 1 bis 3 plus Tagesziel-Ring, Muster und Coach-Chat mit Claude.

## Einrichtung Supabase (einmalig)
1. Im Supabase-Projekt den **SQL-Editor** öffnen, den Inhalt von `supabase/migrations/20261120120000_phase1_fundament.sql` einfügen und auf **Run** klicken.
2. Unter **Authentication → URL Configuration** als **Site URL** die Adresse der App eintragen (zum Beispiel `https://healthcoach-xi.vercel.app`). Dorthin führt der Bestätigungslink nach dem Anlegen des Kontos.
3. In der App **Konto anlegen** wählen, E-Mail bestätigen und anmelden. Danach unter **Authentication → Sign In / Providers** die Option **Allow new users to sign up** ausschalten. Dann kann sich niemand sonst ein Konto anlegen.

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

## Einrichtung Garmin (einmalig)
1. In Garmin Connect im Browser anmelden und https://connect.garmin.com/app/settings/personalApiToken öffnen.
2. **Create Key** wählen, die Bedingungen lesen und annehmen, eine Laufzeit wählen (empfohlen: 1 Jahr) und den Schlüssel kopieren. Garmin zeigt ihn nur einmal.
3. In Supabase unter **Edge Functions → Secrets** ein Secret `GARMIN_API_KEY` mit diesem Schlüssel anlegen. Der Schlüssel kommt nie ins Repo und nie in die App.
4. In Supabase unter **Account → Access Tokens** einen Token anlegen und in GitHub unter **Settings → Secrets and variables → Actions** als `SUPABASE_ACCESS_TOKEN` speichern. Damit lädt GitHub die Funktion `garmin-sync` nach jedem Merge automatisch hoch.
5. Die SQL-Datei `supabase/migrations/20261120140000_phase2_garmin.sql` im SQL-Editor ausführen.

Garmin schickt etwa eine Woche vor Ablauf des Schlüssels eine Erinnerung. Dann einen neuen Schlüssel anlegen und das Secret ersetzen.

## Einrichtung Coach (einmalig)
1. Auf console.anthropic.com einen API-Schlüssel anlegen und Guthaben aufladen.
2. In Supabase unter **Edge Functions → Secrets** ein Secret `ANTHROPIC_API_KEY` anlegen. Optional `COACH_MODEL` für ein anderes Modell (Standard: `claude-sonnet-5-5`).
3. Die SQL-Datei `supabase/migrations/20261121110000_phase4b_coach.sql` im SQL-Editor ausführen.
Der Coach beantwortet höchstens 40 Fragen pro Tag, damit die Kosten überschaubar bleiben.

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
supabase/       Datenbank-Tabellen mit Zugriffsschutz, Funktion garmin-sync
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
