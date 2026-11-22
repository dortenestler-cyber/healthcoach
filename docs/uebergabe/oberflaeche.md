# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWf2XSUGddL6eBy4poY

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Korridore Schritt 1 ist gemergt (PR #60): wandernder Bereich, Bereiche je Zyklusphase, Krankheitstage raus, Abschnitt „Dein Bereich“.

## In Arbeit
- Korridore: Schritt 1 gemergt (PR #60). Konzept: `docs/konzept-korridore-alltagslast.md`.
  Fertig: `lib/baseline.ts` (Bereiche je Phase, `rangeSeries`, `sickDays`, vorläufig ab 7 / stabil ab 14 Tagen), `lib/korridor.ts`, Verlauf-Detail mit Umschalter „Bereich über die Zeit · heute“, HRV-Karte auf Heute mit wanderndem Band.
  Nächster Schritt: Teil B Daten (Alltagslast über den Tagespuls) ist Sache der Rolle Daten, danach Teil B Anzeige (OF), dann A3 (weitere Korridore) und A4 (Hinweis auf Heute nach 3 Tagen außerhalb, `badStreak` in `lib/korridor.ts` liegt schon bereit).

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
- Aufräumen abgeschlossen (`docs/aufraeumen-vorschlag.md`): PR #62 Tagebuch und Zyklus (Hitzewallungen neben Symptomen, Verlauf 4 Wochen eingeklappt, Perioden nachtragen auf Zyklus).
- Aufräumen 1–3 gemergt: PR #56 Heute (5 Karten, Check-in ins Tagebuch), #57 Training (Reiter Auswertung, `/tagesziel` leitet weiter), #59 Einstellungen (nur Einrichtung)
- PR #60 gemergt: Korridore Schritt 1
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
