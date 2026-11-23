# Übergabe · Oberfläche (OF)
Zuletzt aktualisiert: 2026-11-23 · Sitzung: https://claude.ai/code/session_014pVPWgFCDga2xCp5RSJGTU

Zuständig für `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*`. Regeln: `docs/konzept-zwei-instanzen.md`.

## Stand in einem Satz
Farbsystem „Nacht“ und Heute als Einstiegsseite umgesetzt.

## In Arbeit
- Sammelliste Anpassungen (Entwurfs-PR #77, Zweig `claude/kind-keller-hmdy0s`): `docs/sammelliste-oberflaeche.md`. Punkt 1 Coach-Eingabe vorbereitet, Punkt 2 Perioden-Vorschau im Zyklus-Kalender gesammelt.
  Nächster Schritt: weitere Wünsche eintragen, nach Freigabe alles umsetzen und mergen.
- Heute als Einstiegsseite umgesetzt (PR #76, Zweig `claude/determined-davinci-s4e3l7`): `HeuteView` neu aus `DayHead`, `RingRow`, `DaySentence`, `GlanceTiles`, `TodayAgenda`, `RecentActivities`; Detailseiten `app/heute/[wert]` (`HeuteDetail`, Schlüssel in `lib/heuteDetails.ts`). Synchronisieren in `lib/useGarminSync.ts`, Ziehen in `components/ui/PullToRefresh.tsx`. Entfernt: `ValuesCard`, `TodayRings`.
  Nächster Schritt: Detailseiten näher an Whoop (Faktorliste mit Pfeilen statt Bereichsbalken, 3-Stufen-Balken beim Schlaf, Stress-Halbbogen). Stift zum Wählen von Ringen und Kacheln steht noch aus.
- Farb- und Designkonzept „Nacht“, gleicher Zweig: `docs/farb-und-designkonzept.md`, Ansicht `docs/entwurf-farbkonzept.html` (https://claude.ai/artifact/JAF54suDGLf1afKAyjjNQN). Immer dunkel, sechs Farbfamilien, „mehr ist heller“, Energie in Sage hell, neue Variablen `--card-2`, `--axis`, Stufen für Readiness, Pulszonen, Schlafphasen. Heute-Entwurf nutzt die Farben schon.
  Umgesetzt in PR #72: helles Thema, `lib/themeBoot.ts` und Einstellung Darstellung entfernt, `CLAUDE.md` angepasst, neue Variablen in `app/globals.css` (`--card-2`, `--axis`, `--ring-track`, `--energy`, `--recovery-1..4`, `--sleep-rem/-leicht/-wach`, `--stress-ruhe`, `--zone-1..5`, `--brand-light`), Ringe schmal (`ValueRing` Strich 5, `HalfGauge` 8), Ton `energy` für Body Battery und Ruhepuls im Verlauf, Erklärkarte mit Beere am Rand-Ende.
  Nächster Schritt: Heute nach `docs/konzept-heute-einstieg.md`, sobald die fünf Fragen dort beantwortet sind. Pulszonen-Farben `--zone-*` sind vorbereitet, aber noch nirgends benutzt.
- Korridore Schritt 4 (Zweig `claude/confident-fermat-wy3iur`): nichts aus dem Konzept offen, Rückmeldung abwarten.

## Wartet auf
- Nutzerin: Freigabe der Sammelliste (PR #77)
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
- Bildschirmfotos mit Beispieldaten: Skript-Muster siehe PR #76 (Supabase-Anfragen abfangen, Sitzung und PIN in localStorage/sessionStorage setzen, Filter `eq/gte/lt` nachbauen).
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
