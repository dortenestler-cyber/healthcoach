# Backlog Health Coach

Gesammelte Änderungswünsche. Umsetzung erst nach Freigabe, jeweils über eigenen Zweig und Pull Request.

## 20.11.2026 · Übernahmen aus CashFlow (freigegeben)

### Sofort möglich
- [x] **Einstellungsseite** mit Gruppen: Schutz, Coach & Mitteilungen, Aussehen, Daten, Hilfe. Erreichbar über ein Zahnrad im Seitenkopf, die Tab-Leiste bleibt unverändert.
- [x] **Face ID zusätzlich zur PIN**: in den Einstellungen ein- und ausschaltbar, die PIN bleibt als Rückfall.
- [x] **Darstellung**: Automatisch, Hell oder Dunkel. Dunkle Werte als Variablen in `app/globals.css`.
- [x] **Funktionen ein- und ausblenden**, mit Profilen (zum Beispiel Einfach, Standard, Alles), etwa für Zyklus, Perimenopause und Medikamente.
- [x] **Begriffe**: kurze Erklärungen zu HRV, Body Battery, Ruhepuls, Schlafphasen und Trainingslast, ohne Fachjargon.

### Ab Phase 4 (Coach)
- [x] **Coach-Einstellungen**: an oder aus, Tageslimit für Fragen, Kosten pro Monat sichtbar.
- [x] **Hinweise des Coachs**: Liste der Hinweise, auch bereits gesehene erneut anzeigen.
- [x] **Mitteilungen (Push)**: zum Beispiel als Erinnerung an den Check-in am Morgen, an- und abschaltbar.

### Daten und Pflege
- [x] **Export & Backup**: alle eigenen Daten als Sicherung (JSON) und als CSV herunterladen und wiederherstellen.
- [x] **Einrichtungs-Check**: Läuft die Funktion `garmin-sync`, ist `GARMIN_API_KEY` gültig, wann lief der letzte Abruf? Vor Ablauf des Schlüssels warnen.
- [x] **Nutzungsauswertung**: welche Bereiche genutzt werden, als Grundlage für Änderungen („eins rein, eins raus“).
- [x] **Offline-Cache (Service Worker)**: App startet auch ohne Netz und zeigt die zuletzt geladenen Daten.

## 22.11.2026 · Wadenzucken, Wadenkrämpfe und Mustererkennung (wartet auf Freigabe)
Konzept: `docs/konzept-wadenkraempfe.md`
- [ ] **Erfassung**: Zucken und Krämpfe als ein Eintrag mit Intensität (1 Zucken · 2 Krampf · 3 stark), Zeit, Seite, Situation (meist abends). Im Tagebuch, mit Nachtragen für den Vortag. Neue Einflüsse „wenig getrunken“ und „viel geschwitzt“.
- [ ] **Uhr**: später, wir kommen gesondert darauf zurück.
- [ ] **Muster-Motor**: Krämpfe und Erkrankungen gemeinsam gegen Zyklusphase, Training, Schlaf, Einflüsse und Einnahmen (Magnesium) prüfen.
- [ ] **Erkrankungen**: Rückblick auf die 7 Tage vor Krankheitsbeginn.
- [ ] **Anzeige**: Karte „Muskeln“ auf Gesundheit, Zeilen auf Zyklus, Hinweise auf Training und Heute, Warnzeichen mit Verweis auf ärztliche Abklärung.

## 22.11.2026 · Coach nutzt Muster, Empfehlungen und Besonderheiten (wartet auf Freigabe)
Konzept: `docs/konzept-ki-coach.md`
- [ ] **Befunde und Besonderheiten** als feste Regeln in der App, Warnzeichen immer ohne KI.
- [ ] **Zusammenfassung in Teilen**, Seitenbezug im Chat, „Frag den Coach“ auf den Musterkarten.
- [ ] **Tageshinweis** auf Heute mit „Warum?“ und Rückmeldung, Tabelle `coach_hints`.
- [ ] **Wochenrückblick** und **Woche planen** mit „Übernehmen“.
- [ ] **Erzählen statt tippen** im Tagebuch.
- [ ] **Selbstversuch**, **Begleitung nach Krankheit**, Push für Besonderheiten, Uhr.
