# Entscheidungen

Logbuch für beide Rollen. Nur unten anhängen, nichts ändern. Eine Zeile pro Entscheidung:
`Datum · Rolle · Wer: Entscheidung · Grund`

Was schon in `CLAUDE.md` oder einem Konzept steht, gehört nicht hierher.

2026-11-22 · DA · Nutzerin: PRs mit Migrationen merged sie selbst, ihr Merge ist die Freigabe (PR #48) · Migrationen laufen danach automatisch
2026-11-22 · OF · Nutzerin: Stress in Türkis statt Amber (PR #50) · Amber bleibt für Symptome und Warnungen
2026-11-22 · OF · Nutzerin: neues App-Symbol Zen-Ring, dunkle Variante, freigegeben (PR #51)
2026-11-22 · OF · Nutzerin: Arbeit mit zwei Instanzen, Teilung Oberfläche / Daten · weniger Konflikte als eine Teilung nach Seiten
2026-11-22 · OF · Nutzerin: Die Instanzen dürfen sich direkt Nachrichten schicken, verbindlich ist nur die Übergabe-Datei
2026-11-22 · OF/DA · Nutzerin: Konzept Korridore und Alltagslast (PR #60): Alltag als Teil des Belastungsrings, Wochenlast standardmäßig mit Alltag, Korridore für alle vier Zyklusphasen, kranke Tage zählen nicht, kein Tippfeld „anstrengender Tag“, alle neuen Korridore
2026-11-22 · OF · Nutzerin: Konzept Korridore und Alltagslast freigegeben („Leg los“), Umsetzung in der Reihenfolge des Konzepts
2026-11-22 · OF · Nutzerin: Aufräum-Vorschlag freigegeben (`docs/aufraeumen-vorschlag.md`) · Check-in, Symptome und Hitzewallungen nur im Tagebuch, Verlauf bleibt Detailseite, Reihenfolge Heute · Training · Einstellungen · Tagebuch und Zyklus (PR #56, #57, #59)
2026-11-22 · DA · Nutzerin: Readiness der Uhr an die App angleichen (Bereiche je Zyklusphase, Schlaf zyklusabhängig, Krankheitstage raus)
2026-11-22 · DA · Nutzerin: Alltagslast ohne Schrittverlauf: Zone 1 zählt, wenn sie mindestens 10 Minuten am Stück anhält, Zone 2 und höher immer · Garmin liefert keinen Schrittverlauf (404)
2026-11-22 · DA · Nutzerin: Stresskurve über den Tag reparieren
2026-11-23 · OF · Nutzerin: App auf dem iPhone immer dunkel, dazu ein vollständiges Farb- und Designkonzept · Umsetzung nach Freigabe von `docs/farb-und-designkonzept.md`
2026-11-23 · OF · Nutzerin: immer dunkel auch im Browser, nicht nur auf dem iPhone · nur ein Design zu pflegen
2026-11-23 · OF · Nutzerin: Energie (Body Battery) in Sage hell `#8FD5B0`, Familie Erholung
2026-11-23 · OF · Nutzerin: Rand der Erklärkarte läuft zur Beere aus, als Zeichen für den Coach · Farbkonzept „Nacht“ damit freigegeben
2026-11-23 · OF · Nutzerin: Ringe dezenter und schmaler (Strich 5 statt 9 von 104, Halbbogen 8 statt 14, Spur dunkler)
2026-11-23 · OF · Nutzerin: Gesundheit-Symbol in der Tab-Leiste ist ein Blatt statt des Kreuzes
2026-11-23 · OF · Nutzerin: Konzept Heute als Einstiegsseite freigegeben · Energie über den Tag nur als Ring auf Heute, Kurve auf der Energie-Seite
2026-11-23 · OF · Nutzerin: Readiness immer in der Mitte der Ringreihe
2026-11-23 · OF · Nutzerin: vier Kacheln „Auf einen Blick“ (HRV, Ruhepuls, Zyklus, Schlafbedarf), Atemfrequenz und Hauttemperatur auf die Readiness-Seite
2026-11-23 · OF · Nutzerin: Gruß nach Tageszeit als großer Titel auf Heute, der Reiter heißt weiter „Heute“
2026-11-23 · OF · Nutzerin: Synchronisieren per Ziehen nach unten, kein Knopf auf Heute
2026-11-23 · OF · Nutzerin: Anpassungen erst in einer Sammelliste sammeln (`docs/sammelliste-oberflaeche.md`), dann gemeinsam umsetzen (PR #77)
2026-11-23 · OF · Nutzerin: Einklapp-Vorschläge 5a–5h der Sammelliste alle übernommen
2026-11-23 · OF · Nutzerin: Eisprung auch selbst eintragen (Feld im Tagebuch, Migration durch DA nach Freigabe) und weitere übliche Zyklus-Symptome aufnehmen (Sammelliste Punkt 10 und 12)
2026-11-23 · OF · Nutzerin: App-Symbol in grüner Fassung (Sage hell auf dunklem Grüngrau) statt Beere, passend zu getönten iOS-Symbolen; Coach-Knopf bleibt Beere
2026-11-23 · OF · Nutzerin: Web-App-Konzept: Coach am Computer als feste Spalte, „vorerfasst“ = nur Anmeldedaten, iPad wie Computer (keine PIN)
2026-11-23 · OF · Nutzerin: Sammelliste Oberfläche (Punkte 1–13, PR #77) freigegeben, inklusive Datenbank-Änderungen für Punkt 6 (eigene Sportart Garmin) und Punkt 10 (Eisprung-Zeichen im Tagebuch)
2026-11-23 · OF · Nutzerin: Vercel baut nur noch `main`, keine Vorschau-Builds für Arbeitszweige (vercel.json, ignoreCommand), weil der Merge von PR #77 nicht gebaut wurde (vermutlich Tageslimit)
2026-11-23 · OF/DA · Nutzerin: Coach mit Verlaufsliste für vergangene Chats (Tabelle `coach_chats`, Migration freigegeben) · nach 6 Stunden ohne Nachricht beginnt automatisch ein neuer Chat, Chats nur löschen, nicht umbenennen, Titel aus der ersten Frage
2026-11-23 · OF · Nutzerin: Sammelliste Runde 2 (Punkte 14–21) komplett freigegeben, auch Konzept Datenaktualisierung (Teil A und B)
2026-11-23 · OF · Nutzerin: „Last“ heißt künftig „Belastung“ (nicht „Trainingsbelastung“), mit Zusatz „mit Alltag“ bzw. „nur Training“
2026-11-23 · DA · Nutzerin: Garmin-Abruf tagsüber alle 2 Stunden (8–22 Uhr wie vorgeschlagen), B2 schneller nach dem Training ja
2026-11-23 · DA · Nutzerin: Wachphasen (Anzahl) und Sauerstoffsättigung im Schlaf speichern (Migration freigegeben). Hauttemperatur vollständig aus App, Uhr und Datenbank entfernen, weil Garmin sie über die Personal API nicht liefert. Schlafphasen mit Uhrzeit gibt es ebenfalls nicht (PR #84, #87, #90)
2026-11-23 · DA · Nutzerin: Glance der Uhr an die Vorlage aus dem Klick-Dummy anpassen · Zifferblatt-Konzept für Fenix 9 Pro 47 mm ausarbeiten (genau nach Vorlage, Werte austauschbar, passendes Farbkonzept) und weitere Vorschläge digital und minimalistisch
2026-11-23 · DA · Nutzerin: Zifferblatt-Layouts 15 Monolith, 17 Zyklus-Spur, 19 Stapel und 20 Eine Zeile einbauen (16 Ziel-Bogen und 18 Dein Tag nicht)
2026-11-23 · DA · Nutzerin: Monolith ist die Anzeige „Immer an“ auch für das Datenraster (dünner Strich wegen der 10-%-Grenze bei AMOLED, gilt für alle Layouts)
2026-11-23 · DA · Nutzerin: Farbmodus (Einfarbig, Bedeutung, Nacht) ersetzt die 9 Farbregler des Zifferblatts; Zifferblatt auf ganze Pixel anpassen
2026-11-23 · DA · Nutzerin: Uhr-App und Zifferblätter nur über das Garmin-Entwicklerportal hochladen (kein USB). Jede Änderung liefert ein Upload-Paket mit .iq, Store-Icon, Screenshots und Beschreibung (Regel in CLAUDE.md)
2026-11-23 · OF/DA · Nutzerin: Konzept Training-Insights (`docs/konzept-training-insights.md`) freigegeben: Einstieg per Tipp auf die Aktivität und „Insights“ auf Training · Pulszonen und Zeitstrahl der Einheit gleich mit (Migration freigegeben) · eigene Anstrengung 1–10 nach der Einheit ja · Muster ab 5 Einheiten je Gruppe
2026-11-23 · OF · Nutzerin: Sportart einer Einheit direkt auf der Einheit-Seite ändern (z. B. Sonstiges → Karate), PR #104 · Zeitstrahl mit eigener Achse für die Belastung, PR #103
2026-11-23 · DA · Fehlende Spalten für eigene Sportart und Eisprung-Zeichen nachgeholt (Freigabe vom 23.11.), PR #106
2026-11-23 · DA/OF · Nutzerin: Gewohnheiten Sport und Stress automatisch aus Garmin setzen und speichern: Sport ab 20 Minuten Garmin-Aktivität, Stress wenn der Tagesschnitt über dem persönlichen Bereich (30 Tage) liegt, rückwirkend für alle Tage. Abwählen gilt je Tag (PR #108)
2026-11-23 · OF · Fehler: eigene Sportart erschien nicht im Kalender. Alle Ansichten lesen jetzt die eigene Zuordnung (Kalender, Heute, Verlauf, Insights, Karate- und Bouldern-Zähler, Coach), der Name folgt der eigenen Sportart (PR #108)
2026-11-23 · OF · Nutzerin: Muster „Ruhetage zwischen harten Einheiten“ umsetzen · harter Tag wie „Harter Trainingstag“ (ab 70 %, hier nur Training), Ruhetag wie „Sport“ im Tagebuch (keine Aktivität ab 20 Minuten), PR #110
2026-11-24 · DA · Fehler: Morgen-Erinnerung kam nie, Supabase lehnte den Zeitplan ohne Anmeldung ab. `push` wird mit `--no-verify-jwt` hochgeladen (Freigabe 24.11.), PR #111, #113
2026-11-24 · OF · Fehler: Coach-Knopf verdeckte „Ändern“ der Wochenvorlage. Er blendet beim Scrollen nach unten aus, PR #115
2026-11-24 · DA/OF · Nutzerin: Symptome von gestern nicht mehr still übernehmen. Frage nur im Morgen-Check-in (Noch da · Besser · Weg), ohne Antwort zählen sie halb (Readiness, Training, Hinweis auf Heute). Neue Spalte `diary_entries.symptoms_checked`
2026-11-24 · OF · Nutzerin: Ringreihe „Dein Tag“ als Rondell (Ring in der Mitte groß, außen kleiner, fließend beim Wischen) mit Endlos-Schleife · Tipp auf äußeren Ring dreht ihn erst in die Mitte, Tipp auf den mittleren öffnet die Detailseite · Computer/iPad unverändert
2026-11-24 · OF · Nutzerin: Überschrift „Dein Tag“ über den Ringen auf Heute entfernen (für Vorlesehilfen bleibt der Name)
2026-11-24 · OF · Nutzerin: Erklärkarte unter den Ringen zeigt den Text zum Ring in der Mitte (Texte je Ring wie vorgeschlagen) · neue Ringe Zyklus und Intensitätsminuten der Woche
2026-11-24 · OF · Nutzerin: Kachel Zyklus aus „Auf einen Blick“ entfernt, weil der Zyklus jetzt als Ring oben steht (vorerst kein Ersatz)
2026-11-24 · DA · Zeitplan der Erinnerung wartet 60 statt 5 Sekunden auf die Funktion `push` (Freigabe 24.11.), Migration `20261128100000_push_zeitplan_wartezeit`
2026-11-24 · OF · Nutzerin: Im Zyklus-Ring nur die Zahl des Zyklustags, ohne „Tag“
2026-11-24 · OF · Nutzerin: Hinweise wie „… ist bei Garmin nicht abrufbar“ gar nicht mehr anzeigen
2026-11-24 · OF · Nutzerin: solche Hinweise auf allen Seiten entfernen (Wachphasen, Stress-Detail, Einheit)
2026-11-24 · OF/DA · Nutzerin: Alle Claude-Konten dürfen jede Rolle übernehmen, z. B. wenn ein Konto sein Limit erreicht. Abstimmung über die Belegt-Zeile der Übergabe-Datei (Konzept Abschnitt 11)
2026-11-24 · OF/DA · Nutzerin: Belastung darf über 100 % gehen, Skala flacht nach oben ab (wie Bevel) · 150 Last bleibt 100 %, harte Tage sollen weiter sichtbar steigen
2026-11-24 · OF/DA · Nutzerin: Belastungsziel persönlich: übliche Tagesbelastung der letzten 28 Tage × Faktor aus der Readiness, Bereich ± 10
2026-11-24 · OF/DA · Nutzerin: Bremse beim Ziel: Last der letzten 7 Tage über 130 % der 4 Wochen davor, dann Ziel nicht über der üblichen Belastung
2026-11-24 · DA · Nutzerin: leichte Bewegung im Alltag zählt ab 20 % Herzfrequenzreserve mit halbem Gewicht · Vergleich mit Bevel: 5.832 Schritte ergaben 0 Minuten
2026-11-24 · OF · Nutzerin: Karte „Belastung über die Zeit“ (Cardio und Muskeln, Zustand je Tag) ersetzt „Last und Korridor“
2026-11-24 · OF · Nutzerin: Muskelbelastung kombiniert Kettlebell-Sätze mit Bouldern und Karate (Dauer × Anstrengung)
2026-11-24 · OF · Nutzerin: Zustände Kalibrieren, Abbau, Optimal, Müde, Steigt schnell
2026-11-24 · OF/DA · Nutzerin: Wochenvorlage entfällt, Training wird im Kalender geplant (kommende Tage) und erfasst (heute und früher, mit Dauer und Anstrengung)
2026-11-24 · OF/DA · Nutzerin: von der Vorlage schon geplante offene Einheiten werden gelöscht · kein „jede Woche“, Termine plant sie einzeln
2026-11-24 · DA · Nutzerin: Migration für Dauer und Anstrengung in planned_sessions freigegeben
2026-11-24 · OF · Nutzerin: Konzept Bündeln: Wert-Seite unter neuer Adresse `/wert/…`, Reihenfolge der Bausteine wie im Konzept
2026-11-25 · OF · Nutzerin: „Gewohnheiten im Monat“ (Gesundheit › Überblick) und Monatsrückblick (Training › Auswertung) entfallen, „Dein Monat“ ersetzt beide
2026-11-25 · OF · Nutzerin: neues App-Symbol „Blatt mit Puls“ statt Zen-Ring, sofort umsetzen
2026-11-25 · OF · Nutzerin: Karate-Prüfungen: drei Stufen (offen · übe ich · sitzt), Kata in Teile aufklappbar, Begriffe und Theorie kommen dazu, Prüfungsordnung liefert die Nutzerin
2026-11-25 · OF/DA · Nutzerin: Umsetzung Karate-Prüfungsprogramm freigegeben, vorerst mit gekennzeichneter Vorlage bis zur Prüfungsordnung
2026-11-25 · OF · Nutzerin: Prüfungsprogramm nach der Prüfungsordnung Shotokan des DKV; Entwurf erst ansehen, dann übernehmen
2026-11-25 · OF · Nutzerin: Entwurf DKV-Programm freigegeben, in die App übernommen
2026-11-25 · OF · Nutzerin: dritte Runde „Einfach“: Prüfprompt freigegeben, zentraler Kalender öffnet sich über das Datum auf Heute und ein Kalender-Symbol im Kopf jedes Bereichs (mit passender Ebene vorgewählt), kein sechster Navigationspunkt
2026-11-25 · OF · Nutzerin: Pillen zum Ein- und Ausblenden merken ihren Zustand
2026-11-25 · OF · Nutzerin: Konzept Einfach: Tagebuch speichert alles sofort, Knopf „Speichern“ entfällt
2026-11-25 · OF · Nutzerin: Training nur noch Übersicht · Auswertung, Sportarten als eigene Seiten
2026-11-25 · OF · Nutzerin: Kalender mit Zeitraum-Auswahl (Periode, krank von–bis, Gewohnheit, Vergleichen)
2026-11-25 · OF · Nutzerin: Reihenfolge Pillen → Alle Aktivitäten → Kalender → übrige Pakete
2026-11-25 · OF · Nutzerin: Karate: eigene ruhige Seite (A) und Üben im Alltag (B), Zielkarte für alle Sportarten als Rahmen (C)
2026-11-25 · OF · Nutzerin: Fehler Verletzungshinweis mit festem 5. Kyu sofort beheben
2026-11-25 · OF · Nutzerin: Tagesblatt unter dem Trainingskalender ohne Kacheln „Auf einen Blick“ (stehen schon auf Heute)
2026-11-25 · OF · Nutzerin: Uhrzeiten geplanter Einheiten entfallen in der App (Anzeige und Vorgabe beim Planen)
2026-11-25 · OF · Nutzerin: Tagebuch zeigt passend zur Zyklusphase Symptome (eigene Muster zuerst, dann typische) und Eisprung-Zeichen im Fenster; Blutung bleibt sichtbar, kompakter
2026-11-25 · OF · Nutzerin: keine Hinweis- und Erklärtexte mehr in der App (Untertitel, Bedienhinweise, Rechenwege, Disclaimer), dauerhaft in CLAUDE.md
2026-11-25 · OF · Nutzerin: Variante A – der Coach (Claude) schreibt Tagesempfehlung auf Heute und Monatsrückblick, einmal am Tag gespeichert
2026-11-25 · OF · Nutzerin: Schlaf mit Gesamtwert aus Menge und Erholsam (50 : 50) im Ring, Readiness nutzt ihn (docs/konzept-schlafqualitaet.md)
2026-11-25 · OF · Nutzerin: Garmins Schlafwert (sleep_score) ganz aus der App entfernen; Uhr-Readiness, Abruf und Spalte folgen nach Freigabe (Daten)
2026-11-25 · DA · Nutzerin: Garmin-Schlafwert auch aus Uhr, Abruf und Datenbank entfernen; Uhr-Readiness nutzt den eigenen Schlafwert
2026-11-25 · DA · Nutzerin: Funktion coach angepasst (Ziele aktuell, Form der Frage folgen, nichts erklären, Tagesempfehlung/Rückblick ohne Verlauf und außerhalb des Limits); Funktion watch schickt keine Uhrzeiten mehr
2026-11-25 · DA/OF · Nutzerin: Abschnitte (Versuche, Sätze, Runden, Intervalle) nachträglich aus dem Puls erkennen und in der Einheit bestätigen · Konzept im Chat freigegeben
