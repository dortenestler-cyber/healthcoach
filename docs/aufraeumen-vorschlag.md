# Aufräumen · Bestandsaufnahme und Vorschlag

Ergebnis von Schritt 1 und 2 aus `docs/prompt-aufraeumen.md` (Stand 22.11.2026).
Freigegeben am 22.11.2026 mit diesen Entscheidungen:
1. Check-in, Symptome und Hitzewallungen werden nur noch im Tagebuch eingetragen. Heute zeigt einen offenen Check-in als Hinweis mit Link.
2. Der Verlauf bleibt eine eigene Detailseite.
3. Reihenfolge: 1 Heute · 2 Training · 3 Einstellungen · 4 Tagebuch und Zyklus.

## Stand

- [x] 1 Heute (13 → 5 Karten, Fotos in `docs/bilder/aufraeumen/`)
- [ ] 2 Training
- [ ] 3 Einstellungen
- [ ] 4 Tagebuch und Zyklus

## Schritt 1 · Bestandsaufnahme

Nutzungszahlen: Die Seite Einstellungen › Nutzung zählt pro Gerät. Diese Zahlen sehe ich hier nicht.
Bitte vor der Freigabe kurz dort nachsehen, welche Bereiche selten geöffnet werden.

### Seiten

| Pfad | Zeigt | Erreichbar über | Befund |
| --- | --- | --- | --- |
| `/` Heute | 13 Karten (siehe unten) | Navigation | **überladen** |
| `/tagebuch` | Blutung, Symptome, Gewohnheiten, Medikamente, Hitzewallungen, Verlauf 4 Wochen, Periode nachtragen | Navigation | teils doppelt mit Heute |
| `/training` | 5 Auswertungskarten, danach Reiter Kalender · Kettlebell · Klettern · Karate | Navigation | Reiter erst weit unten |
| `/zyklus` | Ring, Phase, Werte nach Zyklustag, Gewohnheiten je Phase | Navigation | in Ordnung |
| `/gesundheit` | Reiter Überblick · Medikamente · Krank & verletzt · Körper | Navigation | in Ordnung |
| `/gesundheit/gewohnheit` | Detail je Gewohnheit | Gesundheit › Überblick | in Ordnung |
| `/verlauf` | HRV, Schlaf, Stress, Body Battery … über die Zeit | Karten auf Heute, Einstellungen › Daten | **versteckt**, Zurück nur zu Heute |
| `/tagesziel` | Was das Ziel bestimmt, Empfehlung je Sportart, Ziel und Ist 14 Tage | Ring und Karte auf Heute | gehört zu Training, eigene Seite ohne Bereich |
| `/muster` | leitet nach `/gesundheit` weiter | – | erledigt |
| `/begriffe` | Begriffe kurz erklärt | Einstellungen › Hilfe | **versteckt** |
| `/coach` | Coach-Chat | schwebender Knopf, Einstellungen | Einstellungs-Zeile „Coach öffnen“ doppelt |
| `/coach/hinweise` | alle Coach-Antworten | Coach-Seite, Einstellungen | doppelt verlinkt |
| `/uhr` | Uhr verbinden | Einstellungen | in Ordnung (einmalige Einrichtung) |
| `/einstellungen/*` | Funktionen, Gewohnheiten, Daten, Check, Nutzung | Zahnrad | Gruppen gemischt: Einrichtung neben Auswertung |

### Heute: 13 Karten untereinander

Ringe · Readiness · Belastung/Tagesziel · Krank/verletzt-Hinweis + Medikamente · Symptome ·
HRV · Schlaf · Stress · Energie über den Tag · Vitalwerte · Heute geplant · Morgen-Check-in · Hitzewallungen.
Das sind deutlich mehr als drei Bildschirmhöhen. Der Check-in, den man morgens zuerst braucht, steht fast ganz unten.

### Doppeltes

| Funktion | Ort 1 | Ort 2 |
| --- | --- | --- |
| Medikamente abhaken | Heute (`HealthToday`) | Tagebuch (`DayIntakes`) |
| Symptome antippen | Heute (`SymptomChips`) | Tagebuch › Symptome |
| Hitzewallung eintragen | Heute (Zähler) | Tagebuch (`FlashCounter`) |
| Gewohnheiten verwalten | Tagebuch „Verwalten ›“ | Gesundheit › Überblick „Verwalten ›“ (beide → Einstellungen, in Ordnung) |
| Coach öffnen | schwebender Knopf | Einstellungen › Coach |

## Schritt 2 · Vorschlag

Grundsatz: **Tagebuch ist das Zuhause für alles, was du einträgst** (auch für Nachträge).
**Heute zeigt den Zustand und eine einzige Karte zum schnellen Eintragen für heute.**
**Auswertung liegt im Bereich, dessen Werte sie zeigt.**

### Neue Gliederung

```text
Heute (5 Karten, umgesetzt)
├─ 1 Ringe: Schlaf · Readiness · Belastung                    unverändert
├─ 2 Readiness                                                 Faktoren und Erklärung eingeklappt
├─ 3 Heute steht an                                            gebündelt aus:
│     Krank/verletzt-Hinweis · Training heute + Belastung kurz · Medikamente ·
│     „Krank oder verletzt?“ · Hinweis „Morgen-Check-in noch offen ›“
├─ 4 Deine Werte: Übersicht · Schlaf · HRV · Stress            aus 4 Karten → 1 mit Umschalter
└─ 5 Energie über den Tag                                      bleibt (CLAUDE.md)
   (ausführliche Belastungskarte → Seite Tagesziel)

Tagebuch
├─ Morgen-Check-in                                             NEU hier (vorher auf Heute)
├─ Blutung
├─ Symptome + Hitzewallungen                                   zusammen (gleiches Thema)
├─ Gewohnheiten
├─ Medikamente und Supplements
└─ Verlauf, 4 Wochen                                           eingeklappt
   (Periode nachtragen → wandert nach Zyklus)

Training
├─ Kopf: Belastungsstatus (eine Karte)
└─ Reiter: Kalender · Auswertung · Kettlebell · Klettern · Karate
      Auswertung = Verhältnis, Lastkurve, Wochenlast, Trainingstage-Raster,
                   Monatsrückblick, Tagesziel (bisher /tagesziel)

Zyklus
└─ wie bisher + „Periode nachtragen“ (aus dem Tagebuch)

Gesundheit
├─ Überblick · Medikamente · Krank & verletzt · Körper         Reiter unverändert
└─ Überblick bekommt unten „Werte über die Zeit ›“ (→ /verlauf) und „Begriffe ›“

Einstellungen (nur Einrichtung)
├─ Konto & Sicherheit   PIN, Sperre, Face ID, Abmelden
├─ Darstellung
├─ Funktionen & Gewohnheiten
├─ Geräte               Uhr verbinden, Einrichtungs-Check
├─ Coach                Einstellungen des Coachs (ohne „Coach öffnen“, ohne „Hinweise“)
├─ Daten                Export & Backup, Nutzung
└─ Hilfe                Begriffe
```

### Änderungen im Einzelnen

| Vorher | Nachher | Grund | Was du sparst |
| --- | --- | --- | --- |
| Heute: 13 Karten | 5 Karten | Heute soll auf einen Blick lesbar sein | ca. zwei Drittel weniger Scrollen |
| Check-in fast ganz unten auf Heute | oben im Tagebuch, auf Heute nur ein Hinweis, solange er offen ist | alles Eintragen an einem Ort | Suchen entfällt |
| Symptome und Hitzewallungen auf Heute und im Tagebuch | nur im Tagebuch | eine Stelle zum Eintragen | – |
| HRV, Schlaf, Stress, Vitalwerte als 4 Karten | eine Karte „Deine Werte“ mit Umschalter | gleiche Art Inhalt | 3 Karten weniger |
| Krank/verletzt, Heute geplant, Medikamente, Tagesziel verstreut | „Heute steht an“ | alles, was heute zu tun ist, an einer Stelle | – |
| `/tagesziel` eigene Seite | Training › Auswertung, alte Adresse leitet weiter | gehört zur Trainingsbelastung | klarer Ort |
| Training: 5 Auswertungskarten vor den Reitern | Reiter oben, Auswertung als eigener Reiter | Kalender sofort erreichbar | ca. 4 Bildschirmhöhen Scrollen |
| Verlauf nur über Einstellungen und Heute-Karten | zusätzlich Gesundheit › Überblick, aus Einstellungen raus | Auswertung gehört nicht in Einstellungen | – |
| Periode nachtragen im Tagebuch | auf Zyklus | Zyklus ist das Zuhause | – |
| Einstellungen: „Coach öffnen“, „Hinweise des Coachs“, „Verlauf“ | entfernt (Coach-Knopf und Coach-Seite reichen) | nur Einrichtung in Einstellungen | kürzere Liste |

### Bewusst nicht geändert

- Navigation mit fünf Bereichen, schwebender Coach-Knopf
- Farben, Ringe, Seitenköpfe, Begriffe
- Seite Zyklus (außer „Periode nachtragen“) und die Reiter von Gesundheit
- Keine Funktion fällt weg, keine Änderung an Datenbank oder Supabase-Funktionen
