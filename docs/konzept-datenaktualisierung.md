# Konzept · Daten regelmäßig aktualisieren

Stand: 23.11. · Sammelliste Punkt 21 · wartet auf Freigabe
Ziel: Wer die App öffnet, auf dem iPhone oder im Browser, sieht ohne Zutun aktuelle Werte. Ziehen nach unten bleibt, ist aber nur noch selten nötig.

## So ist es heute

| Was | Wann | Wo |
|---|---|---|
| Morgen-Abruf bei Garmin (3 Tage) | täglich um 4:15, 5:15 und 6:15 Uhr UTC (5:15–7:15 Uhr bei dir) | Server (`garmin_morning_tick`) |
| Abruf beim Öffnen | nur auf Heute, nur beim ersten Laden, nur wenn der letzte Stand älter als 2 Stunden ist | App (`lib/useGarminSync.ts`) |
| Von Hand | Ziehen nach unten auf Heute, Knopf auf dem iPad und am Computer | App |

Lücken:
- Die App auf dem iPhone bleibt oft stundenlang im Hintergrund geöffnet. Kommt sie zurück, wird nichts neu geladen, weil „erstes Laden“ schon vorbei ist.
- Im Browser bleibt ein Tab den ganzen Tag offen und zeigt den Stand vom Morgen.
- Training, Tagebuch, Zyklus und Gesundheit laden nie selbst nach, nur Heute.
- Ein Eintrag am iPhone erscheint im offenen Browser erst nach Neuladen.
- Nach Mitternacht zeigt eine offene App weiter den Vortag als „heute“.
- Nach dem Training kommen Aktivität und Belastung erst, wenn du selbst ziehst.

## Grundsätze

1. **Zwei Wege trennen.** Neu laden aus der eigenen Datenbank ist billig und darf oft passieren. Ein Abruf bei Garmin ist teuer: Garmin sperrt bei zu vielen Anmeldungen zeitweise. Darum höchstens etwa 12 Abrufe am Tag, egal von wie vielen Geräten.
2. **Der Server holt, die App zeigt.** Garmin wird möglichst vom Server abgerufen. Die App lädt dann nur aus der Datenbank.
3. **Ruhig bleiben.** Kein Flackern, kein Springen. Neue Werte werden still eingesetzt. Der Punkt am Zahnrad (Sammelliste Punkt 7) zeigt, wie alt der Stand ist.

## Teil A · Oberfläche (OF)

A1. **Zurück in die App = neu laden.** Kommt die App in den Vordergrund (iPhone) oder der Tab wieder in den Blick (Browser), lädt sie die Daten aus der Datenbank neu, wenn das letzte Laden länger als 5 Minuten her ist. Gilt für alle Seiten, nicht nur Heute.

A2. **Garmin nur wenn nötig.** Ist der Garmin-Stand dabei älter als 60 Minuten (heute 2 Stunden) und läuft gerade kein Abruf vom Server, stößt die App einen kurzen Abruf an (1 Tag). Höchstens einmal je 30 Minuten über alle Geräte. Dafür merkt sich die Datenbank den letzten Abruf (Teil B).

A3. **Offener Tab bleibt frisch.** Solange die App sichtbar ist, schaut sie alle 15 Minuten in die Datenbank, ob es neue Werte gibt. Keine Anfrage bei Garmin. Im Hintergrund ruht alles.

A4. **Einträge zwischen Geräten.** Tagebuch, Einnahmen, Krankheit und Perioden erscheinen auf dem anderen Gerät mit A1 und A3. Später möglich: sofort per Live-Verbindung von Supabase (Realtime). Erst bauen, wenn A1 und A3 nicht reichen.

A5. **Tageswechsel.** Ist die App um Mitternacht geöffnet, springt Heute auf den neuen Tag, wenn du gerade den alten Tag angesehen hast. Abgehakte Einnahmen und eingeklappte Karten beginnen neu.

A6. **Datenladen an einer Stelle.** Heute lädt jede Seite selbst. Künftig hält eine gemeinsame Stelle im Rahmen der App die Daten, und alle Seiten bekommen dieselben. Das spart Anfragen und ist Voraussetzung für A1 bis A5.

A7. **Neue App-Version.** Gibt es eine neue Version der App, erscheint unten eine Zeile „Neue Version · Tippen zum Laden“. Bisher bleibt die alte Version im Speicher, bis die App ganz geschlossen wird.

A8. **Anzeige.** Der Punkt am Zahnrad bleibt (grau ab 30 Minuten, Amber ab 1 Stunde oder bei Fehler). Am Computer steht unten in der Seitenleiste „Garmin · Stand 14:05“ mit Knopf „Aktualisieren“. Während eines Abrufs dreht sich der Ring im Knopf, die Seite bleibt bedienbar.

## Teil B · Daten (DA), braucht Migration und Freigabe

B1. **Abruf über den Tag.** Zusätzlich zum Morgen-Abruf alle 2 Stunden zwischen 8 und 22 Uhr deiner Zeit ein kurzer Abruf (1 Tag). Das sind 8 weitere Abrufe am Tag. Nachts nichts.

B2. **Nach dem Training schneller.** Steht für heute ein Training im Plan und ist noch keine passende Aktivität da, darf die App schon ab 20 Minuten altem Stand abrufen (statt 60, siehe A2). So steht die Einheit kurz nach dem Training in der App, sobald du sie öffnest.

B3. **Ein Protokoll für alle Abrufe.** Jeder Abruf (Server oder App) trägt sich in `garmin_sync_runs` ein. Die App liest daraus den Stand und ob gerade ein Abruf läuft (für A2). Läuft schon einer, startet kein zweiter.

B4. **Sperre durch Garmin.** Meldet Garmin „zu viele Anfragen“, pausieren alle Abrufe 2 Stunden. Die App zeigt dann am Zahnrad Amber und in den Einstellungen den Satz „Garmin hat kurz gesperrt, nächster Versuch um 16:10“.

B5. **Uhr.** Die Uhr liest aus der Datenbank und bekommt durch B1 tagsüber frischere Zahlen, ohne eigene Änderung.

## Was nicht geht

- Garmin meldet neue Daten nicht von sich aus. Das ginge nur mit der offiziellen Schnittstelle für Firmen, die eine Freigabe durch Garmin braucht. Darum bleibt es beim regelmäßigen Abruf.
- Im Hintergrund kann eine Web-App auf dem iPhone nichts laden. Neu geladen wird erst, wenn du sie öffnest. Push-Mitteilungen (z. B. Check-in-Erinnerung) funktionieren unabhängig davon weiter.

## Kosten und Last

- Keine Anfragen an Claude, also keine Coach-Kosten.
- Garmin: etwa 11 Abrufe am Tag statt 3, dazu wenige von der App (höchstens einer je 30 Minuten). Bleibt unter der Grenze, ab der Garmin erfahrungsgemäß sperrt.
- Supabase: der Zeitplan nutzt das vorhandene pg_cron und pg_net, der Gratis-Rahmen reicht.

## Reihenfolge

1. OF: A6, A1, A3, A5 (ohne Datenbank-Änderung möglich)
2. DA: B3, B4, dann B1 (Migration)
3. OF: A2, A8 (nutzt B3)
4. DA: B2
5. OF: A7

## Fragen an dich

- Reichen alle 2 Stunden tagsüber, oder lieber stündlich (dann etwa 18 Abrufe am Tag, etwas mehr Sperrgefahr)?
- Ab wann und bis wann soll abgerufen werden? Vorschlag 8–22 Uhr.
- Soll B2 (schneller nach dem Training) gebaut werden?
