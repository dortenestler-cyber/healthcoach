# Aufgaben für dich

Was du selbst erledigen musst, meist in Supabase oder auf GitHub. Claude trägt hier neue Aufgaben ein, sobald ein Pull Request etwas von dir braucht, und hakt ab, was erledigt ist.
Projekt in Supabase: `fkvhuxjsdvssmupewwgl` (Region EU, Irland `eu-west-1`).

Migrationen laufen ab jetzt automatisch: Nach dem Merge eines Pull Requests führt GitHub neue Dateien aus `supabase/migrations` in der Datenbank aus (Workflow „Supabase-Migrationen ausführen“). Pull Requests mit Migrationen merged du selbst, dein Merge ist die Freigabe.

## Jetzt

### Sport und Stress automatisch im Tagebuch (PR #108)
- [x] PR #108 gemergt (23. Nov.), Migration und Upload der Funktion grün (geprüft von Claude). Er enthält die Migration `supabase/migrations/20261127110000_gewohnheiten_auto.sql` (drei Spalten im Tagebuch: von Garmin gesetzt, von dir abgewählt, eigener Eintrag) und eine Änderung an `garmin-sync`. Dein Merge ist die Freigabe
- [x] Claude Bescheid gegeben, Läufe grün
- [ ] Einmal synchronisieren (auf Heute nach unten ziehen). Beim ersten Mal setzt die App Sport und Stress rückwirkend für alle Tage mit Garmin-Daten
- [ ] Im Tagebuch einen Tag mit Training öffnen: „Sport · aus Garmin“ ist ausgewählt. Abwählen und speichern gilt nur für diesen Tag

### Eigene Sportart und Eisprung-Zeichen (PR #106)
- [x] PR #106 gemergt (23. Nov.), Migration grün (geprüft von Claude). Er enthält die Migration `supabase/migrations/20261127100000_sportart_eisprung.sql`: die schon am 23.11. freigegebenen Spalten für die eigene Sportart (`garmin_activities.sport_override`, `sport_label`) und die Eisprung-Zeichen (`diary_entries.ovulation_signs`). Sie fehlten bisher, deshalb kam auf der Einheit-Seite eine Fehlermeldung und die Frage auf Heute sowie die Eisprung-Zeile im Tagebuch blieben ausgeblendet
- [x] Claude Bescheid gegeben, Lauf grün
- [ ] Die Einheit vom 16. November öffnen und Karate wählen

### Training-Insights (PR #101)
- [x] PR #101 gemergt (23. Nov.), Migration und Upload der Funktion grün (geprüft von Claude). Er enthält die Migration `supabase/migrations/20261127090000_training_insights.sql` (drei neue Spalten in `garmin_activities`: Pulszonen, Pulsverlauf, Anstrengung) und eine Änderung an `garmin-sync`. Dein Merge ist die Freigabe, Migration und Upload der Funktion laufen danach automatisch
- [x] Claude Bescheid gegeben, Läufe grün
- [ ] Einmal synchronisieren (auf Heute nach unten ziehen). Danach haben die Einheiten der letzten Tage Pulszonen und Zeitstrahl. Für ältere Einheiten im Verlauf „Ein Jahr laden“ antippen
- [ ] Auf Training eine Aktivität antippen und die Einheit-Seite ansehen, dort die Anstrengung 1–10 eintragen. Unter Training › Insights Verlauf und Muster ansehen

### Coach mit Verlauf vergangener Chats (PR #86)
- [x] PR #86 gemergt (23. Nov.), Migration und Upload der Funktion grün (geprüft von Claude). Er enthält die Migration `supabase/migrations/20261126090000_coach_chats.sql` (neue Tabelle `coach_chats`). Deine bisherigen Coach-Nachrichten landen dabei im Chat „Frühere Fragen“
- [ ] Im Coach auf **Verlauf** tippen: Die Liste zeigt deine Chats nach Tagen. Mit **Neuer Chat** beginnt ein leerer Chat, nach 6 Stunden ohne Nachricht passiert das von selbst
- [x] Claude Bescheid gegeben, Läufe grün

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
- [x] `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` angelegt (23. Nov., von Claude erzeugt)
- [x] `VAPID_SUBJECT` angelegt (23. Nov.)
- [x] `PUSH_CRON_SECRET` angelegt (23. Nov.)

### 4. Zeitplan für die Check-in-Erinnerung
Den Zeitplan legt die Migration `20261122180000_push_zeitplan.sql` automatisch an (pg_cron und pg_net schaltet sie selbst ein). Es fehlt nur das Passwort im Tresor:
- [x] Eintrag `push_cron_secret` im Tresor angelegt, gleiches Passwort wie `PUSH_CRON_SECRET` (23. Nov.)
- [x] Erinnerung in der App eingeschaltet, Testmitteilung ist angekommen (23. Nov., von dir bestätigt)

### 4b. Morgen-Erinnerung kam am 24. Nov. nicht an
- [x] Prüflauf „Daten prüfen“ ausgewertet (Claude, 24. Nov.): Supabase hat jeden Aufruf des Zeitplans mit „Missing authorization header“ abgelehnt
- [x] Behoben: `push` wird jetzt ohne die Anmeldesperre von Supabase hochgeladen (PR #113), die Funktion prüft selbst
- [ ] Morgen früh: Kommt die Erinnerung um 7:30 Uhr, wenn du noch nicht eingecheckt hast? Claude Bescheid geben

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
- [x] Morgen-Abruf um 6:15 Uhr klappt (23. Nov., von dir bestätigt, Eintrag in `garmin_sync_runs` ohne Fehler)

### Farb- und Designkonzept „Nacht“ (PR #72, gemergt)
- [x] Ansehen und drei Fragen beantworten (immer dunkel überall, Energie Sage hell, Beere im Rand der Erklärkarte)
- [ ] Nach dem Merge die App auf dem iPhone öffnen: Sie sollte dunkel sein, auch wenn das iPhone auf Hell steht. Ringe schmaler, Readiness-Stufen in vier Grüntönen. Falls die Statusleiste oben falsch aussieht: App vom Home-Bildschirm entfernen und neu hinzufügen (iOS merkt sich die alte Einstellung)

### Vercel baut nur `main`
- [ ] PR #77 ist nicht auf Vercel angekommen: In Vercel › healthcoach › „…“ › **Create Deployment** mit Branch `main` starten (bei „Resource is limited“ die genannte Zeit abwarten)
- [ ] Nach dem nächsten Merge prüfen: Unter Deployments erscheint ein neuer „Production“-Eintrag. Arbeitszweige von Claude erscheinen als „Canceled“/„Ignored“, das ist so gewollt

### Schmerzwerte und Wadenzucken ändern (PR #92)
- [ ] Gesundheit › Krank & verletzt › „Eintrag oder Schmerzwerte ändern“ (auch bei früheren Verletzungen): Schmerzwerte je Tag mit − + ändern, mit ✕ entfernen oder für einen anderen Tag nachtragen, dann Speichern
- [ ] Tagebuch › Wadenzucken und Krämpfe › Ändern: jetzt auch Tag und Uhrzeit. Ein verschobener Eintrag erscheint am neuen Tag

### Sammelliste Runde 2 (Punkte 14–21, PR #83)
- [x] Punkte 14–21 freigegeben, Fragen beantwortet (23.11.)
- [ ] Nach dem Merge ansehen: Verlauf (vier Gruppen, am Computer normale Schriftgröße), Gesundheit › Krank & verletzt (nachtragen, Einträge antippen zum Ändern), Tagebuch › Anzeichen, Heute (Hinweis bei Anzeichen)
- [ ] Teil B der Datenaktualisierung (Abruf alle 2 Stunden vom Server) baut die Daten-Instanz. Der PR enthält eine Migration, die mergst du selbst

### Sammelliste Anpassungen (PR #77)
- [ ] Nach dem Merge: Health Coach vom Home-Bildschirm entfernen und in Safari neu „Zum Home-Bildschirm“ hinzufügen, damit das neue grüne App-Symbol erscheint
- [x] Freigabe der Datenbank-Änderungen für Punkt 6 (eigene Sportart für Garmin-Aktivitäten) und Punkt 10 (Eisprung-Zeichen im Tagebuch), am 23.11. erteilt. Die Daten-Instanz legt die Spalten an; bis dahin sind die Frage zu Garmin-Aktivitäten und die Eisprung-Zeichen ausgeblendet
- [ ] Coach: Das Eingabefeld ist größer und wächst beim Schreiben mit
- [ ] Heute: Sind alle Medikamente abgehakt, steht nur noch eine Zeile da; Tippen klappt auf. Erledigtes Training ebenso
- [ ] Heute: Der Punkt am Zahnrad zeigt, wie alt die Garmin-Daten sind (kein Punkt bis 30 Minuten, grau bis 1 Stunde, Amber danach)
- [ ] Tagebuch: Check-in nach dem Speichern als eine Zeile; neue Zyklus-Symptome unter „Weitere anzeigen“
- [ ] Zyklus: Ring antippen zeigt die Phase mit Datum; der Kalender zeigt die nächsten Perioden (bis 3 Monate vor)
- [ ] Charts: Phasenleiste unter der Zeitachse; Antippen zeigt Datum und Wert
- [ ] Am Computer im Browser öffnen: Seitenleiste links, Coach rechts, keine PIN; nach dem Abmelden steht die E-Mail schon im Feld
- [ ] Auf dem iPad: keine PIN, Seitenleiste mit Symbolen

### Heute als Einstiegsseite (PR #76)
- [x] Entwurf ansehen und die fünf Fragen beantworten
- [ ] Nach dem Merge Heute auf dem iPhone ansehen: Gruß, fünf Ringe (seitlich wischen), Satz zum Tag, vier Kacheln, Heute steht an, Letzte Aktivitäten
- [ ] Einen Ring antippen: Die Detailseite öffnet sich, der Pfeil oben links führt zurück
- [ ] Detailseiten im Whoop-Stil ansehen: Readiness (Faktoren mit Pfeil), Schlaf (drei Stufen je Wert), Stress (Halbbogen, Aufteilung), Energie (Ring und Kurve)
- [ ] Am Seitenanfang nach unten ziehen und loslassen: Garmin wird synchronisiert
- [ ] Mit ‹ einen früheren Tag ansehen, „Zurück zu heute“ führt zurück

### Aufräumen
- [ ] Auf GitHub den Zweig `heute-neu` löschen (versehentlich angelegt, gleicher Inhalt wie PR #38)

### 10. Neues Design „dunkel 2“ (PR #50)
- [ ] Heute, Zyklus und Training in der App ansehen und sagen, was anders sein soll
- [ ] Auf einer Karte „Mehr dazu im Coach“ tippen: Die Frage steht dann vorbereitet im Coach und geht erst nach „Senden“ raus
- [ ] Neue Bildschirme nach `docs/prompt-designkonzept.md` bauen lassen (den Prompt an den Anfang einer neuen Sitzung stellen)

### 11. Atemfrequenz, Stress, Sperrbildschirm, Sport-Icons (PR #51)
Enthält eine Migration und ändert die Funktion `garmin-sync`, deshalb mergst du ihn selbst. Der neue Sperrbildschirm, die Sport-Icons und das neue Coach-Symbol kommen mit demselben Merge.
- [x] PR #51 gemergt. Migration `20261123090000_atem_stress.sql` und Upload von `garmin-sync` grün (geprüft von Claude)
- [x] Synchronisiert: Atemfrequenz und Stress-Aufteilung kommen an (23. Nov., von dir bestätigt). Die Hauttemperatur fehlt, Claude sucht den Grund
- [x] Stressverlauf: Garmin liefert ihn nicht (404), die App erklärt das
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
- [x] Readiness auf der Uhr passt zur App (23. Nov., von dir bestätigt)
- [x] PR #73 gemergt (23. Nov.), Upload grün
- [ ] Nichts weiter tun: Jeder Abruf füllt bis zu 21 ältere Tage nach, nach etwa einer Woche Morgen-Abrufen sind die letzten 90 Tage berechnet

### 15. Schlafphasen mit Uhrzeit und Hauttemperatur, Daten (PR #84, DA)
Enthält eine Migration und ändert die Funktion `garmin-sync`, deshalb mergst du ihn selbst. In der App ist noch nichts Neues zu sehen, die Zeitachse baut danach die Rolle Oberfläche.
- [x] PR #84 gemergt und synchronisiert (23. Nov.), Migration und Upload grün. Ergebnis: Garmin gibt einzelne Nächte unter den bekannten Adressen nicht heraus (404)
- [x] PR #87 gemergt und synchronisiert (23. Nov.). Ergebnis: Garmin liefert über diese Schnittstelle weder Hauttemperatur noch Schlafphasen mit Uhrzeit, nur Summen und die Anzahl der Wachphasen

### 16. Wachphasen und Sauerstoff im Schlaf, Temperatur entfernt, Daten (PR #90, DA)
Enthält eine Migration und ändert die Funktionen `garmin-sync` und `watch`, deshalb mergst du ihn selbst.
- [x] PR #90 gemergt (23. Nov.), Migration und Upload grün (geprüft von Claude)
- [x] Synchronisiert. Geprüft von Claude: Wachphasen und Sauerstoff kommen an (3 Nächte aus dem Abrufzeitraum, jede neue Nacht kommt automatisch dazu)
- [ ] Falls auf dem Zifferblatt ein Feld „Hauttemperatur“ gewählt war: Es bleibt jetzt leer. In Garmin Connect unter den Einstellungen des Zifferblatts einen anderen Wert wählen
- [ ] Die Anzeige der Temperatur in der App entfernt die Rolle Oberfläche in einer eigenen Sitzung, die Bitte steht in ihrer Übergabe

### 17. Glance und Zifferblatt der Uhr (PR #93, DA)
Ändert die Funktion `watch`, deshalb mergst du ihn selbst.
- [x] Konzept angesehen (https://claude.ai/artifact/QT4fgePZ9sizxoYyygED86), entschieden: Layouts 15, 17, 19, 20 kommen dazu (23. Nov.)
- [x] Entschieden: Farbmodus (Einfarbig, Bedeutung, Nacht) ersetzt die 9 Farbregler (23. Nov.)
- [x] PR #93 gemergt (23. Nov.)
- [ ] Uhr-App neu installieren und den Glance prüfen
- [x] PR #96 gemergt (23. Nov.)
- [ ] PR mit den Upload-Paketen mergen (nur Bilder, Texte und der Lauf, keine Funktion)
- [ ] Upload-Pakete holen: GitHub › Actions › „Uhr-App bauen“ › letzter Lauf auf `main` › Artifacts „upload-zifferblatt“ und „upload-uhr-app“ herunterladen und entpacken
- [ ] Im Garmin-Entwicklerportal (apps.garmin.com/developer/upload) je App die `.iq`-Datei hochladen, dann Store-Icon, Screenshots und Texte aus `beschreibung.md` übernehmen
- [ ] Nach der Freigabe durch Garmin auf der Uhr aktualisieren. Garmin fragt beim Zifferblatt einmal nach dem Zugriff auf dein Profil (für „Nacht automatisch“)
- [ ] In Garmin Connect beim Zifferblatt „Layout“ und „Farbmodus“ wählen. Vorher gewählte Farben gehen dabei verloren, das ist gewollt

### Temperatur entfernt, Wachphasen und Sauerstoff (PR #97, OF)
- [ ] Nach dem Merge: Heute › Schlaf ansehen, dort steht die Karte „Wach und Sauerstoff in der Nacht“ (ab der ersten Nacht mit Werten)
- [ ] Prüfen, dass nirgends mehr Hauttemperatur auftaucht (Verlauf, Zyklus, Gewohnheiten, Readiness)

### 18. Uhr-App stürzt nach neuem Uhr-Schlüssel ab (DA)
- [ ] Nach dem Merge im Lauf „Uhr-App bauen“ das Paket `upload-uhr-app` laden, `HealthCoach.iq` im Garmin-Entwicklerportal hochladen und nach der Freigabe auf der Uhr aktualisieren. Statt abzustürzen zeigt die App jetzt den Grund an („FEHLER AUF DER UHR …“). Bitte den Text melden, falls er erscheint

### 19. Uhr-App zeigt Fehler beim Laden (DA)
- [ ] Nach dem Merge `upload-uhr-app` neu hochladen. Die Uhr zeigt dann den echten Fehlercode („FEHLER −300“ usw.), vorher war „Zeitüberschreitung“ auch für „Antwort unlesbar“ beschriftet. Bitte Foto schicken, falls der Fehler bleibt

## Erledigt
- [x] PR #33 gemergt (Einstellungen, Backup, Push)
- [x] PR #34, #35, #36, #37 gemergt (Konzept, `CLAUDE.md`, Fundament, Merge-Regel)
- [x] PR #38 bis #44 gemergt (Heute, Verlauf, Training, Gesundheit, Zyklus, Einnahmen, Nachtragen)
