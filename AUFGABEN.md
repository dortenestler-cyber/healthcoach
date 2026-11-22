# Aufgaben für dich

Was du selbst erledigen musst, meist in Supabase oder auf GitHub. Claude trägt hier neue Aufgaben ein, sobald ein Pull Request etwas von dir braucht, und hakt ab, was erledigt ist.
Projekt in Supabase: `fkvhuxjsdvssmupewwgl` (Region EU, Irland `eu-west-1`).

Migrationen laufen ab jetzt automatisch: Nach dem Merge eines Pull Requests führt GitHub neue Dateien aus `supabase/migrations` in der Datenbank aus (Workflow „Supabase-Migrationen ausführen“). Pull Requests mit Migrationen merged du selbst, dein Merge ist die Freigabe.

## Jetzt

### Wadenzucken und Wadenkrämpfe erfassen (PR #49)
- [x] PR #49 gemergt (22. Nov.), Migration grün (geprüft von Claude). Er enthält die Migration `supabase/migrations/20261123110000_muskeln.sql` (neue Tabelle `muscle_events`). Dein Merge ist die Freigabe, danach legt GitHub die Tabelle automatisch an (das Secret `SUPABASE_DB_URL` ist eingerichtet)
- [ ] Magnesium unter **Gesundheit › Medikamente** als Supplement eintragen (falls noch nicht geschehen) und täglich abhaken, damit die spätere Auswertung Tage mit und ohne Einnahme vergleichen kann
- [ ] Im Tagebuch einen Testeintrag machen und wieder löschen
- [ ] Unter **Gesundheit › Körper** (Karte Waden) und auf **Zyklus** nachsehen, ob die Karten erscheinen. Muster zeigt die App erst ab 8 Tagen mit Zucken oder Krampf

### 1. Migrationen automatisch ausführen lassen (PR #48)
- [x] Datenbank-Passwort bereitlegen: In Supabase unter **Project Settings → Database** steht, wie du es neu setzen kannst, falls du es nicht mehr weißt
- [x] In Supabase oben auf **Connect** tippen, **Session pooler** wählen und die Verbindungs-Adresse kopieren. Darin `[YOUR-PASSWORD]` durch das Passwort ersetzen
- [x] Auf GitHub unter **Settings → Secrets and variables → Actions** das Secret `SUPABASE_DB_URL` mit dieser Adresse anlegen
- [x] PR #48 ansehen und mergen. Danach läuft der Workflow „Supabase-Migrationen ausführen“ zum ersten Mal. Er führt alle Migrationen einmal aus, auch die alten. Das schadet nicht, weil jede mehrfach laufen darf. Damit sind auch `coach_kosten`, `push`, `schlafphasen` und `energie_tag` erledigt
- [x] Claude Bescheid geben, dann prüft Claude, ob der Lauf grün ist (22. Nov.: beide Läufe grün, alle 17 Migrationen ausgeführt)

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
- [x] `supabase/migrations/20261122150000_schlafphasen.sql`: ausgeführt
- [x] Upload von `garmin-sync` nach dem Merge ist grün
- [ ] In der App auf Heute **Synchronisieren** tippen. Die Schlafkarte sollte dann Tief, REM, Leicht und Wach zeigen. Wenn nicht, Claude Bescheid geben

### 6. Seite Zyklus und Energie über den Tag (PR #43, enthält PR #42)
- [x] `supabase/migrations/20261122170000_energie_tag.sql`: ausgeführt
- [x] PR #42 und #43 gemergt
- [x] Upload von `garmin-sync` nach dem Merge ist grün (geprüft von Claude)
- [ ] In der App auf Heute **Synchronisieren** tippen. Die Karte „Energie über den Tag“ steht jetzt auf Heute. Steht dort „Body Battery im Tagesverlauf ist bei Garmin nicht abrufbar“, Claude Bescheid geben
- [ ] Die neue Seite **Zyklus** in der Navigation ansehen und sagen, was fehlt oder anders sein soll

### 7. Readiness nach dem persönlichen Bereich (PR #45)
- [x] PR #45 gemergt (22. Nov.), Upload der Funktionen grün (Claude merged ihn nicht selbst, weil er die Uhr-Funktion `watch` ändert). Keine Migration nötig
- [ ] Ein paar Tage beobachten, ob die Readiness-Stufe zu deinem Gefühl passt, und Claude Rückmeldung geben

### 8. Früheres nachtragen
- [ ] Im Tagebuch unten unter **Vergangene Perioden nachtragen** deine früheren Perioden eintragen (die Zyklus-Seite verlinkt dorthin). Je mehr, desto genauer werden Phasen und Vergleiche

### 9. Zyklus aus Garmin und Abruf um 6:15 Uhr (PR #47, ersetzt PR #14)
- [x] PR #47 gemergt (22. Nov.), Migration und Upload von `garmin-sync` grün (geprüft von Claude). Damit liefen die Migration `20261123120000_garmin_zyklus_morgenabruf.sql` (Tabellen, Schlüssel im Vault, Zeitplan, `pg_cron` und `pg_net`) und der Upload von `garmin-sync` automatisch
- [x] PR #14 geschlossen, er ist durch #47 ersetzt
- [ ] Am nächsten Morgen nach 6:15 Uhr die App öffnen: Die Daten sollten schon da sein. Steht auf Heute ein Hinweis zum Morgen-Abruf, Claude Bescheid geben

### Aufräumen
- [ ] Auf GitHub den Zweig `heute-neu` löschen (versehentlich angelegt, gleicher Inhalt wie PR #38)

### 10. Neues Design „dunkel 2“ (PR #50)
- [ ] Heute, Zyklus und Training in der App ansehen und sagen, was anders sein soll
- [ ] Auf einer Karte „Mehr dazu im Coach“ tippen: Die Frage steht dann vorbereitet im Coach und geht erst nach „Senden“ raus
- [ ] Neue Bildschirme nach `docs/prompt-designkonzept.md` bauen lassen (den Prompt an den Anfang einer neuen Sitzung stellen)

### 11. Atemfrequenz, Stress, Sperrbildschirm, Sport-Icons (PR #51)
Enthält eine Migration und ändert die Funktion `garmin-sync`, deshalb mergst du ihn selbst. Der neue Sperrbildschirm, die Sport-Icons und das neue Coach-Symbol kommen mit demselben Merge.
- [x] PR #51 gemergt. Migration `20261123090000_atem_stress.sql` und Upload von `garmin-sync` grün (geprüft von Claude)
- [ ] In der App auf Heute **Synchronisieren** tippen. Unter Vitalwerte sollte dann die Atemfrequenz stehen, auf der Stress-Karte die Aufteilung und die längste Phase mit erhöhtem Stress
- [ ] Steht dort „Stress im Tagesverlauf ist bei Garmin nicht abrufbar“ oder fehlt die Atemfrequenz, Claude Bescheid geben
- [ ] App einmal sperren lassen (5 Minuten im Hintergrund) und den neuen Sperrbildschirm mit PIN und Face ID ausprobieren

### 12. Gesundheit mit Überblick und Gewohnheiten (auch in PR #51)
- [x] Migration `20261123100000_gewohnheiten.sql` (Sauna-Details) ausgeführt
- [ ] Im Tagebuch bei der nächsten Sauna „Sauna“ antippen und Gänge, Wann und Kältebecken wählen
- [ ] Unter Einstellungen › Gewohnheiten die Liste prüfen und bei Bedarf eigene Gewohnheiten anlegen
- [ ] Nach ein paar Wochen unter Gesundheit › Überblick › Sauna ansehen (Vergleiche erscheinen ab je 5 Nächten mit und ohne)
- [x] Neues App-Symbol (Zen-Ring, dunkel) freigegeben
- [ ] Nach dem Merge die App vom Startbildschirm löschen und über Safari neu hinzufügen, damit iOS das neue Symbol übernimmt

### 13. Zwei Claude-Instanzen (PR #54, Konzept `docs/konzept-zwei-instanzen.md`)
- [ ] Neue Sitzungen mit diesem Satz starten: „Du bist die Rolle **Oberfläche** (oder **Daten**) im Projekt Health Coach. Folge `docs/konzept-zwei-instanzen.md`, Abschnitt 6 „Start“.“
- [ ] Pro Rolle nur eine Sitzung gleichzeitig laufen lassen
- [x] PR #14 geschlossen (ersetzt durch PR #47)

### 14. Belastung aus dem Alltag, Daten (PR #63, DA)
Enthält eine Migration und ändert die Funktion `garmin-sync`, deshalb mergst du ihn selbst. In der App ist noch nichts zu sehen, die Anzeige baut danach die Rolle Oberfläche.
- [x] PR #63 gemergt (22. Nov.), Migration `20261124090000_alltagslast.sql` und Upload von `garmin-sync` grün (geprüft von Claude)
- [x] Synchronisiert (22. Nov.). Geprüft von Claude: Der Tagespuls kommt an, 21 Tage sind berechnet, persönlicher Faktor aus 6 Trainings
- [x] PR #68 gemergt und synchronisiert. Ergebnis: 39 Tage berechnet. Schrittverlauf und Stress je Tag gibt es bei Garmin unter dieser Adresse nicht (404), eine aktive Zeit liefert Garmin nicht
- [x] PR #69 gemergt und synchronisiert. Ergebnis: 57 Tage berechnet, aktive Kalorien kommen an. Den Schrittverlauf gibt Garmin auch mit Profilnamen nicht heraus, Bewegung im Alltag erkennt die App also nur am Puls
- [x] Entschieden (22. Nov.): Zone 1 zählt ab 10 Minuten am Stück, Readiness der Uhr wie in der App, Stresskurve reparieren
- [x] PR #70 gemergt und synchronisiert (22. Nov.), Upload grün. 21 Tage schon mit der neuen Regel berechnet, die übrigen 36 folgen mit den nächsten Abrufen. Die Stresskurve gibt Garmin auch unter der zweiten Adresse nicht heraus (404)
- [ ] Danach auf der Uhr nachsehen, ob die Readiness zur App passt (Zahl auf Heute)
- [ ] Nichts weiter tun: Jeder Abruf füllt bis zu 21 ältere Tage nach, nach etwa einer Woche Morgen-Abrufen sind die letzten 90 Tage berechnet

## Erledigt
- [x] PR #33 gemergt (Einstellungen, Backup, Push)
- [x] PR #34, #35, #36, #37 gemergt (Konzept, `CLAUDE.md`, Fundament, Merge-Regel)
- [x] PR #38 bis #44 gemergt (Heute, Verlauf, Training, Gesundheit, Zyklus, Einnahmen, Nachtragen)
