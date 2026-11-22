# Aufgaben für dich

Was du selbst erledigen musst, meist in Supabase oder auf GitHub. Claude trägt hier neue Aufgaben ein, sobald ein Pull Request etwas von dir braucht, und hakt ab, was erledigt ist.
Projekt in Supabase: `fkvhuxjsdvssmupewwgl` (Region Frankfurt).

So führst du eine Migration aus: In Supabase links **SQL Editor** öffnen, den Inhalt der Datei einfügen, **Run** drücken. Mehrfaches Ausführen schadet nicht.

## Jetzt

### 1. Migrationen ausführen
- [ ] `supabase/migrations/20261122120000_coach_kosten.sql`: Verbrauch des Coachs, damit die App die Kosten pro Monat zeigt (aus PR #33)
- [ ] `supabase/migrations/20261122130000_push.sql`: Tabelle für Push-Mitteilungen. Nur den oberen Teil ausführen, der Zeitplan unten kommt erst in Schritt 4 (aus PR #33)

### 2. Funktionen hochladen
Der automatische Upload nach PR #33 ist gescheitert (GitHub hatte zu viele Anfragen). Das ist inzwischen behoben, muss aber einmal von Hand angestoßen werden:
- [x] Upload angestoßen (Claude, 22. Nov.). Nach dem Merge von PR #38 lief er ohnehin noch einmal.
- [x] Beide Läufe sind grün (geprüft von Claude): `coach`, `garmin-sync`, `push` und `watch` sind aktuell.

### 3. Secrets für Push-Mitteilungen
In Supabase unter **Edge Functions → Secrets** anlegen:
- [ ] `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY`: auf einem Rechner mit `npx web-push generate-vapid-keys` erzeugen
- [ ] `VAPID_SUBJECT`: `mailto:` und deine E-Mail-Adresse
- [ ] `PUSH_CRON_SECRET`: ein langes, beliebiges Passwort (brauchst du gleich noch einmal)

### 4. Zeitplan für die Check-in-Erinnerung
- [ ] In Supabase unter **Database → Extensions** `pg_cron` und `pg_net` einschalten
- [ ] Den Zeitplan-Block unten in `supabase/migrations/20261122130000_push.sql` ohne die `--` am Zeilenanfang ausführen. Dabei `<PROJEKT>` durch `fkvhuxjsdvssmupewwgl` und `<PUSH_CRON_SECRET>` durch das Passwort aus Schritt 3 ersetzen
- [ ] In der App unter **Einstellungen** die Erinnerung einschalten und eine Testmitteilung schicken

### 5. Heute im neuen Design (PR #38)
- [x] PR #38 ansehen und mergen
- [ ] `supabase/migrations/20261122150000_schlafphasen.sql` ausführen: Spalten für die Schlafphasen
- [x] Upload von `garmin-sync` nach dem Merge ist grün
- [ ] In der App auf Heute **Synchronisieren** tippen. Die Schlafkarte sollte dann Tief, REM, Leicht und Wach zeigen. Wenn nicht, Claude Bescheid geben

### 6. Seite Zyklus und Energie über den Tag (PR #43, enthält PR #42)
- [ ] `supabase/migrations/20261122170000_energie_tag.sql` ausführen: Spalten für den Body-Battery-Verlauf und die Schlafzeiten
- [x] PR #42 und #43 gemergt
- [x] Upload von `garmin-sync` nach dem Merge ist grün (geprüft von Claude)
- [ ] In der App auf Heute **Synchronisieren** tippen. Die Karte „Energie über den Tag“ steht jetzt auf Heute. Steht dort „Body Battery im Tagesverlauf ist bei Garmin nicht abrufbar“, Claude Bescheid geben
- [ ] Die neue Seite **Zyklus** in der Navigation ansehen und sagen, was fehlt oder anders sein soll

### 7. Readiness nach dem persönlichen Bereich (PR #45)
- [ ] PR #45 ansehen und mergen (Claude merged ihn nicht selbst, weil er die Uhr-Funktion `watch` ändert). Keine Migration nötig
- [ ] Ein paar Tage beobachten, ob die Readiness-Stufe zu deinem Gefühl passt, und Claude Rückmeldung geben

### 8. Früheres nachtragen
- [ ] Im Tagebuch unten unter **Vergangene Perioden nachtragen** deine früheren Perioden eintragen (die Zyklus-Seite verlinkt dorthin). Je mehr, desto genauer werden Phasen und Vergleiche

### 9. Aufräumen
- [ ] Auf GitHub den Zweig `heute-neu` löschen (versehentlich angelegt, gleicher Inhalt wie PR #38)

## Erledigt
- [x] PR #33 gemergt (Einstellungen, Backup, Push)
- [x] PR #34, #35, #36, #37 gemergt (Konzept, `CLAUDE.md`, Fundament, Merge-Regel)
- [x] PR #38 bis #44 gemergt (Heute, Verlauf, Training, Gesundheit, Zyklus, Einnahmen, Nachtragen)
