# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-22 · Sitzung: https://claude.ai/code/session_014pVPWcev7TRm7tv21449Sf

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Korridore Schritt 1 ist fertig (PR #60, Zweig `claude/confident-fermat-wy3iur`): wandernder Bereich, Bereiche je Zyklusphase, Krankheitstage raus, Abschnitt „Dein Bereich“.

## In Arbeit
- PR #60 `[OF/DA] Konzept und Schritt 1: lebendige Korridore`. Konzept: `docs/konzept-korridore-alltagslast.md`.
  Fertig: `lib/baseline.ts` (Bereiche je Phase, `rangeSeries`, `sickDays`, vorläufig ab 7 / stabil ab 14 Tagen), `lib/korridor.ts`, Verlauf-Detail mit Umschalter „Bereich über die Zeit · heute“, HRV-Karte auf Heute mit wanderndem Band.
  Nächster Schritt: Teil B Daten (Alltagslast über den Tagespuls) ist Sache der Rolle Daten, danach Teil B Anzeige (OF), dann A3 (weitere Korridore) und A4 (Hinweis auf Heute nach 3 Tagen außerhalb, `badStreak` in `lib/korridor.ts` liegt schon bereit).

## Wartet auf
- Nutzerin: Freigabe für den Aufräum-Vorschlag `docs/aufraeumen-vorschlag.md` (PR #53, aus einer anderen Sitzung). Betrifft vor allem Seiten, darum Oberfläche. Braucht das Aufräumen Änderungen an der Datenbank, übernimmt Daten diesen Teil
- Nutzerin: Rückmeldung zu Heute, Zyklus und Training im Design „dunkel 2“ (`AUFGABEN.md` Abschnitt 10)
- Nutzerin: Rückmeldung zur Seite Zyklus (`AUFGABEN.md` Abschnitt 6)

## Für die andere Rolle
- Daten: Teil B des Konzepts `docs/konzept-korridore-alltagslast.md` (Migration und `garmin-sync` für die Alltagslast). Freigegeben am 22.11.
- Daten: Die Readiness der Uhr (`supabase/functions/watch/target.ts`) nutzt noch nur den Luteal-Bereich. Die App misst jetzt je Zyklusphase, Schlaf zählt auch als zyklusabhängig, und Krankheitstage zählen nicht. Bitte angleichen, damit Uhr und App dasselbe zeigen.

## Fallstricke
- Vor jedem Umbau eines Bildschirms den Prompt in `docs/prompt-designkonzept.md` befolgen.
- Keine festen Farbwerte in Komponenten, nur Variablen aus `app/globals.css`.

## Erledigt seit letzter Übergabe
- Korridore Schritt 1 (PR #60, noch offen)
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
