# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWf2XSUGddL6eBy4poY

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Korridore Schritt 3 (Alltagslast in der Anzeige) ist fertig, PR offen. Danach A3 (weitere Korridore) und A4 (Hinweis auf Heute).

## In Arbeit
- Korridore Schritt 3, Zweig `claude/confident-fermat-wy3iur`: `dayLoad` in `lib/insights.ts` (Training + Alltag, Rückfall auf alte Rechnung ohne `load_daily_min`), `loadByDay(acts, daily)` in `lib/today.ts`, `weekLoad`/`loadRatio` mit `alltag`. Ring auf Heute und Halbbogen geteilt (Training kräftig, Alltag `--training-alltag`), Belastungskarte mit Kachel „Alltag in Bewegung“, Wochenlast mit geteilten Säulen, Umschalter „Mit Alltag · Nur Training“ auf Training (nur sichtbar, wenn es Alltagsdaten gibt). Begriff „Belastung aus dem Alltag“.
  Nächster Schritt: A3, neue Korridore (Tagesbelastung, Alltagsschritte, Tief- und REM-Schlaf, Schlafbeginn, Body Battery aufgeladen, hoher Stress). Danach A4 mit `badStreak` aus `lib/korridor.ts`.

## Wartet auf
- Nutzerin: Rückmeldung zu Heute, Zyklus und Training im Design „dunkel 2“ (`AUFGABEN.md` Abschnitt 10)
- Nutzerin: Rückmeldung zur Seite Zyklus (`AUFGABEN.md` Abschnitt 6)

## Für die andere Rolle
- Daten: Teil B des Konzepts `docs/konzept-korridore-alltagslast.md` (Migration und `garmin-sync` für die Alltagslast). Freigegeben am 22.11.
- Daten: Die Readiness der Uhr (`supabase/functions/watch/target.ts`) nutzt noch nur den Luteal-Bereich. Die App misst jetzt je Zyklusphase, Schlaf zählt auch als zyklusabhängig, und Krankheitstage zählen nicht. Bitte angleichen, damit Uhr und App dasselbe zeigen.

## Fallstricke
- Bildschirmfotos ohne echte Daten: mit `NEXT_PUBLIC_SUPABASE_URL=https://beispiel.supabase.co` bauen und die Anfragen in Playwright abfangen (Beispieldaten kennzeichnen). Vorher alte `next-server`-Prozesse beenden, sonst liefert ein alter Server veraltete Dateien.
- Vor jedem Umbau eines Bildschirms den Prompt in `docs/prompt-designkonzept.md` befolgen.
- Keine festen Farbwerte in Komponenten, nur Variablen aus `app/globals.css`.

## Erledigt seit letzter Übergabe
- Korridore Schritt 3: Alltagslast in der Anzeige (PR folgt)
- Aufräumen abgeschlossen (`docs/aufraeumen-vorschlag.md`): PR #62 Tagebuch und Zyklus (Hitzewallungen neben Symptomen, Verlauf 4 Wochen eingeklappt, Perioden nachtragen auf Zyklus).
- Aufräumen 1–3 gemergt: PR #56 Heute (5 Karten, Check-in ins Tagebuch), #57 Training (Reiter Auswertung, `/tagesziel` leitet weiter), #59 Einstellungen (nur Einrichtung)
- PR #60 gemergt: Korridore Schritt 1
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
