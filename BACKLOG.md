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
