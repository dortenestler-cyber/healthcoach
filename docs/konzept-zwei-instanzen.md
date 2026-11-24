# Konzept: Zwei Claude-Instanzen an Health Coach

Stand: 22. Nov. 2026 · Freigegeben

## Ausgangslage

Jede Claude-Sitzung in der Cloud startet in einem frischen Container. Sie kennt nur, was im Repo steht. Der Chat und alles, was nicht gepusht ist, sind weg, sobald die Sitzung endet oder der Container abgeräumt wird.

Mit zwei Instanzen gibt es zwei Risiken:

1. **Überschneidung**: Beide ändern dieselben Dateien, es entstehen Konflikte oder doppelte Arbeit.
2. **Wissensverlust**: Eine Sitzung endet, die nächste weiß nicht, was halb fertig ist, was entschieden wurde und worauf sie wartet.

## Grundsatz

**Das Repo ist das einzige Gedächtnis.** Was die nächste Sitzung wissen muss, steht in einer Datei im Repo und ist gepusht. Der Chat ist nur Arbeitsfläche.

## 1. Rollen mit festen Zuständigkeiten

Die Instanzen teilen sich die Arbeit nach Bereichen, nicht nach Zufall. Jede Rolle hat Ordner, die nur sie ändert.

| Rolle | Kürzel | Zuständig für | Ändert allein |
|---|---|---|---|
| **Oberfläche** | `OF` | Bildschirme, Design, Texte in der App, Diagramme | `app/`, `components/`, `public/`, `app/globals.css`, `docs/design-*` |
| **Daten** | `DA` | Datenbank, Garmin, Coach-Backend, Uhr, Abläufe auf GitHub | `supabase/` (Migrationen und Funktionen), `watch/`, `watchface/`, `.github/` |

Gemeinsam genutzt, mit Regeln (Abschnitt 4): `lib/`, `package.json`, `CLAUDE.md`, `AUFGABEN.md`, `BACKLOG.md`, `README.md`.

Braucht eine Rolle etwas aus dem Bereich der anderen (zum Beispiel eine neue Spalte für einen neuen Bildschirm), schreibt sie es der anderen Rolle in die Übergabe (Abschnitt 2, „Für die andere Rolle“) und baut nicht selbst.

Pro Rolle läuft immer nur **eine** Sitzung gleichzeitig.

## 2. Übergabe-Dateien

Ordner `docs/uebergabe/` mit drei Dateien:

### `docs/uebergabe/oberflaeche.md` und `docs/uebergabe/daten.md`
Jede Rolle schreibt nur in ihre eigene Datei, liest aber beide. Damit gibt es dort nie Konflikte. Aufbau, immer gleich:

```markdown
# Übergabe · Oberfläche
Zuletzt aktualisiert: 2026-11-22 14:30 · Sitzung: <Link zur Sitzung>

## Stand in einem Satz
Seite Zyklus ist fertig, PR #55 wartet auf den Build.

## In Arbeit
- Zweig `claude/…`, PR #55 (Entwurf): Ring mit Phasen. Fertig: Ring, Legende. Offen: Tooltips.
  Nächster Schritt: `components/zyklus/PhasenRing.tsx` Tooltips ergänzen.

## Wartet auf
- Nutzerin: Freigabe für Farbe der Lutealphase (gefragt am 22.11.)
- Rolle Daten: Spalte `zyklus_tag.symptome` (siehe dort)

## Für die andere Rolle
- Brauche in `tagebuch` eine Spalte `sauna_gaenge int`. Kein Eilfall.

## Fallstricke
- `npm run build` scheitert, wenn … (so gelöst: …)

## Erledigt seit letzter Übergabe
- PR #54 gemergt: Kopf mit Farbverlauf auf Training
```

### `docs/uebergabe/entscheidungen.md`
Gemeinsames Logbuch, nur anhängen, nie ändern. Eine Zeile pro Entscheidung:

```
2026-11-22 · OF · Nutzerin: Stress bleibt Türkis, auch im hellen Design · Grund: feste Farbbedeutung
```

Hier landet alles, was die Nutzerin entschieden hat und was nicht schon in `CLAUDE.md` oder einem Konzept steht. So muss keine Sitzung eine Frage zweimal stellen.

## 3. Wer arbeitet woran: Anmelden über Entwurfs-PR

Bevor eine Instanz eine Aufgabe beginnt:

1. `git fetch` und die offenen Pull Requests ansehen.
2. Gibt es schon einen PR zur Aufgabe, nicht anfangen.
3. Sonst eigenen Zweig anlegen, ersten Commit pushen und sofort einen **Entwurfs-PR** öffnen. Titel mit Kürzel: `[OF] Seite Zyklus: Ring mit Phasen`.

Der Entwurfs-PR ist die Anmeldung. Er ist für die andere Instanz und für die Nutzerin sofort sichtbar, ohne dass eine gemeinsame Datei geändert werden muss. Im `BACKLOG.md` wird erst beim Merge abgehakt.

## 4. Regeln für gemeinsame Dateien

| Datei | Regel |
|---|---|
| `AUFGABEN.md` | Neue Aufgaben nur als eigener, nummerierter Abschnitt mit PR-Nummer und Kürzel. Fremde Abschnitte nur abhaken, nicht umschreiben. |
| `BACKLOG.md` | Nur abhaken, was der eigene PR erledigt. Neue Wünsche unten anhängen. |
| `CLAUDE.md` | Änderungen nur nach Freigabe der Nutzerin, als eigener kleiner PR. |
| `package.json` | Neue Abhängigkeiten nur nach Absprache über die Übergabe-Datei. |
| `lib/` | Neue Dateien frei. Bestehende Dateien ändert die Rolle, deren Bereich sie hauptsächlich nutzt. Im Zweifel in „Für die andere Rolle“ fragen. |

Vor jedem Öffnen und vor jedem Merge eines PR: `git fetch origin main && git merge origin/main`, dann `tsc` und `npm run build`.

## 5. Datenbank: nur eine Rolle schreibt Migrationen

Migrationen schreibt nur die Rolle **Daten**. Damit gibt es keine Zeitstempel, die sich überschneiden, und keine zwei Änderungen an derselben Tabelle.

Reihenfolge, wenn die Oberfläche eine neue Spalte braucht:

1. Oberfläche trägt den Wunsch in ihre Übergabe ein.
2. Daten baut die Migration, PR `[DA] …`, Eintrag in `AUFGABEN.md`. Die Nutzerin merged (ihr Merge ist die Freigabe).
3. Oberfläche baut den Bildschirm, der PR-Text nennt: „Braucht PR #… (gemergt)“.

Ein PR der Oberfläche wird nie vor der Migration gemergt, die er braucht.

## 6. Ablauf einer Sitzung

### Start (Pflicht, in dieser Reihenfolge)
1. `CLAUDE.md` lesen.
2. Eigene Übergabe lesen, dann die der anderen Rolle, dann `docs/uebergabe/entscheidungen.md`.
3. Offene PRs und Zweige der eigenen Rolle ansehen (`[OF]` oder `[DA]`). Gibt es einen halb fertigen Zweig, diesen auschecken und dort weitermachen, statt neu anzufangen.
4. `AUFGABEN.md`: Ist etwas erledigt, worauf die eigene Rolle gewartet hat?
5. Der Nutzerin in zwei bis drei Sätzen sagen, wo es weitergeht.

### Während der Arbeit
- Kleine Schritte, jeder Schritt ein Commit mit klarer Nachricht auf Deutsch, **sofort pushen**. Fällt der Container weg, fehlt höchstens der letzte Schritt.
- Die Übergabe-Datei im Arbeitszweig mitpflegen, spätestens bei jeder Pause und vor jeder Frage an die Nutzerin.
- Eine Entscheidung der Nutzerin sofort in `entscheidungen.md` eintragen.

### Ende (Pflicht)
1. Übergabe-Datei aktualisieren: Stand, In Arbeit mit nächstem konkreten Schritt, Wartet auf.
2. Alles committen und pushen. `git status` muss leer sein.
3. Ist der PR fertig und erfüllt die Regeln aus `CLAUDE.md`: mergen. Sonst bleibt er Entwurf, der Stand steht in der Übergabe.

## 7. Wenn eine Sitzung ohne Übergabe endet

Fällt eine Sitzung unerwartet weg, rekonstruiert die nächste den Stand aus:

1. der Übergabe-Datei im offenen Zweig der Rolle (kann ein paar Schritte alt sein),
2. den Commits im Zweig (`git log main..HEAD`),
3. dem Text des Entwurfs-PR.

Deshalb gilt: PR-Text und Commit-Nachrichten so schreiben, dass sie ohne den Chat verständlich sind.

## 8. Direkte Abstimmung zwischen den Instanzen

Cloud-Sitzungen können sich gegenseitig Nachrichten schicken. Das ist erlaubt für kurze Hinweise („PR #57 mit der Spalte ist gemergt“). Verbindlich ist aber nur, was in der Übergabe-Datei steht. Eine Nachricht ersetzt nie den Eintrag.

## 9. Was du als Nutzerin tust

- Eine neue Sitzung mit diesem Satz starten:
  > Du bist die Rolle **Oberfläche** (oder **Daten**) im Projekt Health Coach. Folge `docs/konzept-zwei-instanzen.md`, Abschnitt 6 „Start“.
- Pro Rolle nur eine Sitzung gleichzeitig laufen lassen.
- Wünsche direkt der passenden Rolle geben. Bist du unsicher, gib sie einer der beiden, sie leitet über die Übergabe weiter.
- Migrationen und Supabase-Funktionen weiter selbst freigeben, wie bisher.

## 10. Umsetzung

Umgesetzt am 22. Nov. 2026:

- `docs/uebergabe/oberflaeche.md`, `docs/uebergabe/daten.md` mit dem aktuellen Stand, `docs/uebergabe/entscheidungen.md`
- Abschnitt „Zwei Instanzen“ in `CLAUDE.md`
- Vorlage für PR-Texte: `.github/pull_request_template.md`

Entschieden: Teilung Oberfläche / Daten. Die Instanzen dürfen sich direkt Nachrichten schicken (Abschnitt 8).

## 11. Mehrere Konten und Ablösung bei Limit

Stand: 24. Nov. 2026 · Freigegeben

Jedes Claude-Konto der Nutzerin darf jede Rolle übernehmen, auch die Rolle **Kasse** `[CF]` im Repo cashflow-app (Übergabe dort: `UEBERGABE.md`). Rollen gehören zu Arbeitsbereichen, nicht zu Konten. Sitzungen verschiedener Konten können sich keine Nachrichten schicken, deshalb gilt Abschnitt 8 nur innerhalb eines Kontos.

### Belegt-Zeile
Zweite Zeile jeder Übergabe-Datei:

```
Belegt: Konto A · Sitzung <Link> · seit 2026-11-24 14:30
Belegt: frei
```

- Beim Start nach dem Lesen setzen und sofort pushen (im Arbeitszweig und, wenn möglich, als kleiner Commit über den Entwurfs-PR). Zusammen mit dem Entwurfs-PR ist sie die Anmeldung.
- Steht dort eine andere Sitzung: nur weitermachen, wenn die Nutzerin die Übernahme ausdrücklich sagt.
- Konten nur als „Konto A“ / „Konto B“, nie mit E-Mail-Adresse.
- Am Ende der Sitzung: `Belegt: frei`.

### Laufend übergeben
Ein Limit kommt ohne Vorwarnung. Deshalb die Übergabe nach jedem abgeschlossenen Schritt nachführen und pushen, nicht erst am Ende. „In Arbeit“ nennt immer den nächsten konkreten Schritt mit Datei. Zeigt Claude an, dass das Limit naht: sofort Übergabe schreiben, pushen, `· Limit erwartet` an die Belegt-Zeile hängen.

### Übernahme
1. Die Nutzerin startet im anderen Konto eine Sitzung:
   > Übernahme: Das andere Konto hat sein Limit erreicht. Du übernimmst die Rolle **Oberfläche** (oder **Daten**, **Kasse**). Lies die Übergabe-Datei auf `main` und im offenen Zweig der Rolle, gleiche sie mit den Commits und dem PR ab, setz die Belegt-Zeile auf dein Konto („übernommen“) und mach beim nächsten Schritt weiter. Sag mir vorher in 2–3 Sätzen, wo du ansetzt.
2. Ist der Zweig neuer als die Übergabe, den Rest aus `git log main..HEAD` und dem PR-Text rekonstruieren (Abschnitt 7).
3. Belegt-Zeile: `Belegt: Konto B · Sitzung <Link> · seit … · übernommen von Konto A`, pushen.
4. Auf dem vorhandenen Zweig weitermachen. Lässt die Sitzung nur ihren eigenen Zweig zu: vom alten abzweigen, neuen Entwurfs-PR öffnen, den alten mit Verweis schließen.

### Rückkehr des ersten Kontos
Nie einfach im alten Chat weitermachen. Neu starten, Belegt-Zeile lesen, nur übernehmen, wenn sie `frei` ist oder die Nutzerin es sagt.

### Einrichtung (Nutzerin)
Siehe `AUFGABEN.md`, Abschnitt „Mehrere Claude-Konten“.
