# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-23 · Sitzung: https://claude.ai/code/session_014pVPWewGvc4fmfts8C73m8

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Sammelliste (13 Punkte) und Web-App am Computer umgesetzt (PR #77).

## In Arbeit
- Keine offene Arbeit. PR #77 (Zweig `claude/kind-keller-hmdy0s`): Sammelliste `docs/sammelliste-oberflaeche.md` komplett, Web-App nach `docs/konzept-web-app.md`.
  Neu: `components/SideNav.tsx`, `components/CoachPanel.tsx`, `components/ui/TwoCol.tsx`, `lib/layout.ts` (Breiten, Coach-Spalte), `components/charts/pick.tsx` (Antippen in Charts), `components/heute/ActivityQuestion.tsx`, `lib/ovulation.ts`. Eisprung ist jetzt eigene `PhaseGroup`. `sportOf(a)` statt `sportOfGarmin(a.type_key)` (eigene Zuordnung zuerst). PIN nur iPhone (`pinRequired`).
  Nächster Schritt: Rückmeldung der Nutzerin; danach evtl. zwei Spalten für Training › Kalender und Gesundheit › Überblick/Medikamente.
- Detailseiten nach Whoop sind mit PR #78 gemergt (`FactorList`, `ReadinessCard`/`HrvCard`/`StressCard` entfernt). Stift zum Wählen von Ringen und Kacheln: noch nicht freigegeben, nur vorgeschlagen.

## Wartet auf
- Daten: Spalten `garmin_activities.sport_override/sport_label` und `diary_entries.ovulation_signs` (siehe unten). Bis dahin blendet die Oberfläche beides aus.
- Nutzerin: Rückmeldung zu PR #77 (`AUFGABEN.md` Abschnitt „Sammelliste Anpassungen“)
- Nutzerin: Rückmeldung zur neuen Seite Heute (`AUFGABEN.md` Abschnitt „Heute als Einstiegsseite“)
- Nutzerin: Rückmeldung zu Heute, Zyklus und Training im Design „dunkel 2“ (`AUFGABEN.md` Abschnitt 10)
- Nutzerin: Rückmeldung zur Seite Zyklus (`AUFGABEN.md` Abschnitt 6)

## Für die andere Rolle
- Daten: **Freigegeben am 23.11.** Zwei Migrationen für die Sammelliste (`docs/sammelliste-oberflaeche.md`). Die Oberfläche liest und schreibt diese Namen, bitte so anlegen:
  - `garmin_activities.sport_override text null` (Werte `karate|kettlebell|klettern|ausdauer|sonstiges|ignorieren`) und `garmin_activities.sport_label text null` (eigener Name bei „Anderes“). `garmin-sync` darf beide beim Upsert nicht überschreiben. Update-Recht für die eigene Zeile per RLS.
  - `diary_entries.ovulation_signs text[] not null default '{}'` (Werte `test|mittelschmerz|schleim|temperatur`).
  Bis die Spalten da sind, blendet die Oberfläche die Funktionen aus (Fehler werden abgefangen).
- Daten: Laut Nutzerin kommt die Hauttemperatur nicht in der App an (`skin_temp_delta` leer). Bitte in `garmin-sync` prüfen. Die Readiness-Seite zeigt solange „Hauttemperatur kommt noch nicht von Garmin an“.
- Daten: Teil B des Konzepts `docs/konzept-korridore-alltagslast.md` (Migration und `garmin-sync` für die Alltagslast). Freigegeben am 22.11.
- Daten: Die Readiness der Uhr (`supabase/functions/watch/target.ts`) nutzt noch nur den Luteal-Bereich. Die App misst jetzt je Zyklusphase, Schlaf zählt auch als zyklusabhängig, und Krankheitstage zählen nicht. Bitte angleichen, damit Uhr und App dasselbe zeigen.

## Fallstricke
- Bildschirmfotos mit Beispieldaten am Computer: Bau mit `NEXT_PUBLIC_SUPABASE_URL=https://beispiel.supabase.co`, Sitzung als `sb-beispiel-auth-token` in localStorage, REST-Anfragen abfangen (Filter `eq/gte/lte/not.is.null`). Breiten 390, 1024, 1440 prüfen.
- Abstände zwischen Abschnitten kommen aus `.app-content > * + *` (früher `.shell > * + *`). Inhalte in `TwoCol` haben eigene Abstände.
- Bildschirmfotos mit Beispieldaten: Skript-Muster siehe PR #76 (Supabase-Anfragen abfangen, Sitzung und PIN in localStorage/sessionStorage setzen, Filter `eq/gte/lt` nachbauen).
- Bildschirmfotos ohne echte Daten: mit `NEXT_PUBLIC_SUPABASE_URL=https://beispiel.supabase.co` bauen und die Anfragen in Playwright abfangen (Beispieldaten kennzeichnen). Vorher alte `next-server`-Prozesse beenden, sonst liefert ein alter Server veraltete Dateien.
- Vor jedem Umbau eines Bildschirms den Prompt in `docs/prompt-designkonzept.md` befolgen.
- Keine festen Farbwerte in Komponenten, nur Variablen aus `app/globals.css`.

## Erledigt seit letzter Übergabe
- Coach-Fehler behoben (Zweig `claude/blissful-darwin-ww6tm7`): Antworten brachen ab, weil das Nachdenken des Modells zu `max_tokens` 900 zählte (jetzt 6000, effort low, abgeschnittene Antworten werden nicht gespeichert). Zusammenfassung enthält jetzt die Werte von heute und wird vor jeder Frage erneuert, wenn sie älter als 2 Minuten ist. Antworten mit fett und Listen, Senden als runder Pfeil-Knopf. Ändert auch `supabase/functions/coach` (DA-Bereich), daher Merge erst nach Freigabe.
- PR #72 gemergt: Farbsystem „Nacht“ (immer dunkel, schmale Ringe, Energie Sage hell) und Konzept Heute als Einstiegsseite (nur Doku)
- PR #65 gemergt: Korridore Schritt 3, Alltagslast in der Anzeige
- Aufräumen abgeschlossen (`docs/aufraeumen-vorschlag.md`): PR #62 Tagebuch und Zyklus (Hitzewallungen neben Symptomen, Verlauf 4 Wochen eingeklappt, Perioden nachtragen auf Zyklus).
- Aufräumen 1–3 gemergt: PR #56 Heute (5 Karten, Check-in ins Tagebuch), #57 Training (Reiter Auswertung, `/tagesziel` leitet weiter), #59 Einstellungen (nur Einrichtung)
- PR #60 gemergt: Korridore Schritt 1
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
