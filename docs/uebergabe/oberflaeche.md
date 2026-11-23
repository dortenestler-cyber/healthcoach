# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-23 · Sitzung: https://claude.ai/code/session_014pVPWgFCDga2xCp5RSJGTU

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Farbsystem „Nacht“ umgesetzt (immer dunkel, schmale Ringe). Konzept „Heute als Einstiegsseite“ wartet auf Antworten.

## In Arbeit
- Konzept Heute als Einstiegsseite, Zweig `claude/determined-davinci-s4e3l7`: `docs/konzept-heute-einstieg.md`, Entwurf `docs/entwurf-heute-einstieg.html` (veröffentlicht: https://claude.ai/artifact/HtFtkHrKKDQJaBQmiuLHEQ), Prompt `docs/prompt-heute-einstieg.md`. Fünf Ringe (Energie, Schlaf, Readiness, Belastung, Stress), eine Erklärkarte, Kacheln „Auf einen Blick“, Heute steht an, Letzte Aktivitäten; Detailseiten je Ring.
  Nächster Schritt: Antworten auf die fünf offenen Fragen, nach Freigabe ein PR für Heute, dann Detailseiten.
- Farb- und Designkonzept „Nacht“, gleicher Zweig: `docs/farb-und-designkonzept.md`, Ansicht `docs/entwurf-farbkonzept.html` (https://claude.ai/artifact/JAF54suDGLf1afKAyjjNQN). Immer dunkel, sechs Farbfamilien, „mehr ist heller“, Energie in Sage hell, neue Variablen `--card-2`, `--axis`, Stufen für Readiness, Pulszonen, Schlafphasen. Heute-Entwurf nutzt die Farben schon.
  Umgesetzt in PR #72: helles Thema, `lib/themeBoot.ts` und Einstellung Darstellung entfernt, `CLAUDE.md` angepasst, neue Variablen in `app/globals.css` (`--card-2`, `--axis`, `--ring-track`, `--energy`, `--recovery-1..4`, `--sleep-rem/-leicht/-wach`, `--stress-ruhe`, `--zone-1..5`, `--brand-light`), Ringe schmal (`ValueRing` Strich 5, `HalfGauge` 8), Ton `energy` für Body Battery und Ruhepuls im Verlauf, Erklärkarte mit Beere am Rand-Ende.
  Nächster Schritt: Heute nach `docs/konzept-heute-einstieg.md`, sobald die fünf Fragen dort beantwortet sind. Pulszonen-Farben `--zone-*` sind vorbereitet, aber noch nirgends benutzt.
- Korridore Schritt 4 (Zweig `claude/confident-fermat-wy3iur`): nichts aus dem Konzept offen, Rückmeldung abwarten.

## Wartet auf
- Nutzerin: Sichtung und Antworten zum Konzept Heute (`AUFGABEN.md` Abschnitt „Heute als Einstiegsseite“)
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
- PR #72 gemergt: Farbsystem „Nacht“ (immer dunkel, schmale Ringe, Energie Sage hell) und Konzept Heute als Einstiegsseite (nur Doku)
- PR #65 gemergt: Korridore Schritt 3, Alltagslast in der Anzeige
- Aufräumen abgeschlossen (`docs/aufraeumen-vorschlag.md`): PR #62 Tagebuch und Zyklus (Hitzewallungen neben Symptomen, Verlauf 4 Wochen eingeklappt, Perioden nachtragen auf Zyklus).
- Aufräumen 1–3 gemergt: PR #56 Heute (5 Karten, Check-in ins Tagebuch), #57 Training (Reiter Auswertung, `/tagesziel` leitet weiter), #59 Einstellungen (nur Einrichtung)
- PR #60 gemergt: Korridore Schritt 1
- PR #50: Design-Konzept „dunkel 2“
- PR #51: Sperrbildschirm, Sport-Icons, Coach-Symbol, Gesundheit mit Überblick, App-Symbol Zen-Ring
