# Prompt: Glance der Uhr weiterbauen

Diesen Text als erste Nachricht in eine neue Sitzung kopieren.

---

Du bist die Rolle **Daten** im Projekt Health Coach. Folge `docs/konzept-zwei-instanzen.md`, Abschnitt 6 „Start“: `CLAUDE.md`, `docs/uebergabe/daten.md`, `docs/uebergabe/oberflaeche.md`, `docs/uebergabe/entscheidungen.md` und die offenen PRs mit `[DA]` lesen. Melde dich mit Zweig und Entwurfs-PR „[DA] Glance …“ an.

**Aufgabe:** Den Glance der Uhr-App (`watch/source/GlanceView.mc`) weiter an die Vorlage anpassen und auf der Fenix 9 Pro 47 mm (AMOLED, 454 × 454) fertig machen.

**Vorlage:** `docs/bilder/vorlagen/18-uhr-glance.png` (aus dem Klick-Dummy). Inhalt von oben nach unten:
- „TAGESZIEL“
- Belastung bisher als große Segmentziffern mit Geisterziffern („18“), darunter „VON 45–65 %“
- zwei Zeilen Faktoren mit Abzug („SCHLAF −8 | HRV −10“, „BB −2 | NS −5“)
- „NÄCHSTES: KB 18:00“ und „EINHEIT B · 40 MIN“
- links und rechts Strich-Anzeigen (10 Striche, links Tagesziel bisher)

Die Bildschirme stehen im Klick-Dummy unter „Glance“ und „Heute geplant“. Die Datei hat die Nutzerin hochgeladen. Wenn du sie brauchst, bitte sie darum.

**Stand (PR #93, gemergt):**
- Die Funktion `watch` liefert in `today`:
  - `load`: Belastung bisher in %, wie `dayLoad` in `lib/insights.ts`
  - `band`: Zielbereich [lo, hi]
  - `factors`: Abzüge als [{k, e}], k z. B. SCHLAF, HRV, PULS, BB, CHECK-IN, SYMPTOME, ZYKLUS, KRANK
  - `goal`, `pause`, `plan` und `kb`
- `GlanceView.mc` zeichnet in einem Streifen:
  - oben Kopfzeile „TAGESZIEL · VON 45–65 %“
  - links zwei Segmentziffern mit Geisterziffern und „%“
  - rechts daneben die Faktoren mit Abzug, zwei je Zeile
  - unten die nächste Einheit
  - Farben dunkel und einfarbig wie das Zifferblatt: `BRIGHT` #E4E5DF, `MUTED` #7E8085, `GHOST` #2A2B2F
- Gebaut nur über den Lauf „Uhr-App bauen“ (`.github/workflows/watch-build.yml`). Auf einer Uhr hat ihn noch niemand gesehen. Hier gibt es keinen Monkey-C-Compiler.

**Offene Punkte, in dieser Reihenfolge:**
1. **Auf der Uhr prüfen lassen:** Die Nutzerin installiert die Uhr-App neu und schickt ein Foto oder beschreibt den Glance. Größe und Lesbarkeit danach anpassen. Garmin zeigt Glances als schmalen Streifen; die Höhe weißt du erst zur Laufzeit (`dc.getHeight()`). Der Code passt die Zeilen schon an die Höhe an.
2. **Strich-Anzeige wie in der Vorlage:** links 10 Striche für „Tagesziel bisher“ (`load` ÷ 10), sofern im Streifen Platz ist.
3. **Zweite Zeile der nächsten Einheit:** Die Vorlage zeigt „EINHEIT B · 40 MIN“.
   - `planned_sessions` hat keine Dauer und keinen Einheitennamen.
   - Für Kettlebell gibt es `kb` (Planname, Woche).
   - Vorschlag an die Nutzerin: Planname und Woche zeigen, oder eine Dauer in der Datenbank ergänzen. Das wäre eine Migration und braucht ihre Freigabe.
4. **Kürzel prüfen:** Im Glance steht „BB“ (Body Battery), die Vorlage hat „NS“ (Nachtschweiß, steckt bei uns in SYMPTOME). Die Nutzerin wünscht Icons statt Abkürzungen; die Icons im 16er-Raster stehen in `watchface/source/Icons.mc`. Prüfen, ob sie in den Glance passen: Glance-Code braucht `(:glance)`, der Speicher ist knapp.
5. **Farbmodus wie beim Zifferblatt:**
   - Das Zifferblatt hat seit PR #96 „Einfarbig / Bedeutung / Nacht“, mit Familienfarben in `watchface/source/Fields.mc` (`FAM`, `FAMCOL`).
   - Der Glance gehört zur Uhr-App, nicht zum Zifferblatt, und hat keine eigene Einstellung.
   - Die Nutzerin fragen, ob der Glance einfarbig bleibt oder eine eigene Einstellung bekommt.
6. **Tippen auf den Glance:** öffnet heute das Menü der Uhr-App. Die runde Vorlage passt eher als eigene Seite „Tagesziel“ beim Öffnen. Nur nach Freigabe bauen.

**Regeln:**
- Änderungen an der Funktion `watch` (`supabase/functions/watch/`) nie selbst mergen.
- `watch/target.ts` ist ein Nachbau von `computeTarget` in `lib/insights.ts`. Die Rechnung darf sich nicht unterscheiden.
- Jeden Schritt committen und pushen. Entscheidungen der Nutzerin sofort in `docs/uebergabe/entscheidungen.md`.
- Was die Nutzerin selbst tun muss, in `AUFGABEN.md`.
- Am Ende `docs/uebergabe/daten.md` aktualisieren.
- Texte auf Deutsch, klar und knapp. Beispieldaten kennzeichnen.
