# Aufgaben für dich

Was du selbst erledigen musst, meist in Supabase oder auf GitHub. Claude trägt hier neue Aufgaben ein, sobald ein Pull Request etwas von dir braucht, und hakt ab, was erledigt ist.
Projekt in Supabase: `fkvhuxjsdvssmupewwgl` (Region Frankfurt).

Migrationen laufen ab jetzt automatisch: Nach dem Merge eines Pull Requests führt GitHub neue Dateien aus `supabase/migrations` in der Datenbank aus (Workflow „Supabase-Migrationen ausführen“). Pull Requests mit Migrationen merged du selbst, dein Merge ist die Freigabe.

## Jetzt

### 1. Migrationen automatisch ausführen lassen (PR #48)
- [ ] Datenbank-Passwort bereitlegen: In Supabase unter **Project Settings → Database** steht, wie du es neu setzen kannst, falls du es nicht mehr weißt
- [ ] In Supabase oben auf **Connect** tippen, **Session pooler** wählen und die Verbindungs-Adresse kopieren. Darin `[YOUR-PASSWORD]` durch das Passwort ersetzen
- [ ] Auf GitHub unter **Settings → Secrets and variables → Actions** das Secret `SUPABASE_DB_URL` mit dieser Adresse anlegen
- [ ] PR #48 ansehen und mergen. Danach läuft der Workflow „Supabase-Migrationen ausführen“ zum ersten Mal. Er führt alle Migrationen einmal aus, auch die alten. Das schadet nicht, weil jede mehrfach laufen darf. Damit sind auch `coach_kosten`, `push`, `schlafphasen` und `energie_tag` erledigt
- [ ] Claude Bescheid geben, dann prüft Claude, ob der Lauf grün ist

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
Den Zeitplan legt die Migration `20261122180000_push_zeitplan.sql` automatisch an (pg_cron und pg_net schaltet sie selbst ein). Es fehlt nur das Passwort im Tresor:
- [ ] In Supabase unter **Integrations → Vault** (oder **Project Settings → Vault**) einen Eintrag mit dem Namen `push_cron_secret` anlegen. Wert: dasselbe Passwort wie `PUSH_CRON_SECRET` aus Schritt 3
- [ ] In der App unter **Einstellungen** die Erinnerung einschalten und eine Testmitteilung schicken

### 5. Heute im neuen Design (PR #38)
- [x] PR #38 ansehen und mergen
- [ ] `supabase/migrations/20261122150000_schlafphasen.sql`: läuft automatisch mit Schritt 1
- [x] Upload von `garmin-sync` nach dem Merge ist grün
- [ ] In der App auf Heute **Synchronisieren** tippen. Die Schlafkarte sollte dann Tief, REM, Leicht und Wach zeigen. Wenn nicht, Claude Bescheid geben

### 6. Seite Zyklus und Energie über den Tag (PR #43, enthält PR #42)
- [ ] `supabase/migrations/20261122170000_energie_tag.sql`: läuft automatisch mit Schritt 1
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

### 10. Neues Design „dunkel 2“ (PR #50)
- [ ] Heute, Zyklus und Training in der App ansehen und sagen, was anders sein soll
- [ ] Auf einer Karte „Mehr dazu im Coach“ tippen: Die Frage steht dann vorbereitet im Coach und geht erst nach „Senden“ raus
- [ ] Neue Bildschirme nach `docs/prompt-designkonzept.md` bauen lassen (den Prompt an den Anfang einer neuen Sitzung stellen)

### 11. Atemfrequenz, Stress, Sperrbildschirm, Sport-Icons (PR #51)
Enthält eine Migration und ändert die Funktion `garmin-sync`, deshalb mergst du ihn selbst. Der neue Sperrbildschirm, die Sport-Icons und das neue Coach-Symbol kommen mit demselben Merge.
- [ ] PR #51 ansehen und mergen. Danach laufen Migration `20261123090000_atem_stress.sql` und der Upload von `garmin-sync` automatisch
- [ ] In der App auf Heute **Synchronisieren** tippen. Unter Vitalwerte sollte dann die Atemfrequenz stehen, auf der Stress-Karte die Aufteilung und die längste Phase mit erhöhtem Stress
- [ ] Steht dort „Stress im Tagesverlauf ist bei Garmin nicht abrufbar“ oder fehlt die Atemfrequenz, Claude Bescheid geben
- [ ] App einmal sperren lassen (5 Minuten im Hintergrund) und den neuen Sperrbildschirm mit PIN und Face ID ausprobieren

### 12. Gesundheit mit Überblick und Gewohnheiten (auch in PR #51)
- [ ] Mit dem Merge von PR #51 läuft auch die Migration `20261123100000_gewohnheiten.sql` (Sauna-Details). Vorher speichert das Tagebuch die Gewohnheit, aber noch keine Details
- [ ] Im Tagebuch bei der nächsten Sauna „Sauna“ antippen und Gänge, Wann und Kältebecken wählen
- [ ] Unter Einstellungen › Gewohnheiten die Liste prüfen und bei Bedarf eigene Gewohnheiten anlegen
- [ ] Nach ein paar Wochen unter Gesundheit › Überblick › Sauna ansehen (Vergleiche erscheinen ab je 5 Nächten mit und ohne)
- [ ] Entwurf für das neue App-Symbol (Zen-Ring) ansehen und freigeben oder Änderungen nennen

## Erledigt
- [x] PR #33 gemergt (Einstellungen, Backup, Push)
- [x] PR #34, #35, #36, #37 gemergt (Konzept, `CLAUDE.md`, Fundament, Merge-Regel)
- [x] PR #38 bis #44 gemergt (Heute, Verlauf, Training, Gesundheit, Zyklus, Einnahmen, Nachtragen)
