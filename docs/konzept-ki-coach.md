# Konzept: Der Coach nutzt Muster, gibt Empfehlungen und weist auf Besonderheiten hin

Stand: 22.11.2026 · Status: **Entwurf, wartet auf Freigabe**
Baut auf `docs/konzept-wadenkraempfe.md` auf (Muster-Motor).

## Ausgangslage
Heute ist der Coach ein reiner Chat:
- Die App baut im Browser eine Zusammenfassung (`lib/coachContext.ts`: Tagesziel, Garmin-Schnitte, Zyklus, Symptome, Aktivitäten, Mittel, Krankheit, Verletzungen, Plan, Kettlebell, Bouldern, fertige Muster) und schickt sie bei **jeder** Frage mit.
- Die Funktion `coach` antwortet und speichert Frage und Antwort. „Hinweise“ zeigt diese Antworten noch einmal.
- Der Coach meldet sich nie von selbst. Er weiß nicht, auf welcher Seite man gerade ist, und kann nichts in der App vorschlagen, was man mit einem Tipp übernehmen könnte.

## Grundsatz: Rechnen tut die App, formulieren tut die KI
| Aufgabe | Wer | Warum |
|---|---|---|
| Muster finden, Zahlen vergleichen, Mindestdaten prüfen | App (feste Regeln in `lib/`) | nachprüfbar, kostet nichts, keine erfundenen Zahlen |
| Warnzeichen erkennen | App (feste Regeln) | muss immer funktionieren, auch ohne Netz und ohne Coach |
| Mehrere Befunde zu einer Empfehlung verbinden, verständlich erklären, Fragen beantworten | KI | dafür ist sie gut |
| Etwas in der App ändern (Plan, Eintrag) | Nutzerin | die KI schlägt nur vor, gespeichert wird erst nach Bestätigung |

Der Coach bekommt also **fertige Befunde mit Grundlage** („4 von 10 Tagen vor der Periode mit Krampf, sonst 1 von 10, Grundlage 3 Zyklen“) statt Rohdaten. Er darf nur Zahlen nennen, die in den Befunden stehen.

---

## 1. Bausteine

### 1.1 Befunde aus dem Muster-Motor (`lib/muster.ts`)
Jedes Muster liefert einen einheitlichen Befund:

```
{ id: "krampf_vor_periode", bereich: "zyklus", ereignis: "Krampftag", bedingung: "5 Tage vor der Periode",
  mit: 0.4, ohne: 0.1, grundlage: "3 Zyklen, 12 Krampftage", sicher: "mittel", trifftHeuteZu: true }
```

`trifftHeuteZu` ist der Schlüssel für Empfehlungen: Ein Muster ist erst dann für heute wichtig, wenn seine Bedingung heute gilt (heute ist Tag 24, heute ist eine lange Ausdauereinheit geplant …).

Die Muster, die es heute schon gibt (HRV im Zyklus, Nacht nach harten Tagen, Bufori-Bedarf, Einflüsse und Schlaf, Gefühl gegen Messwert), werden in dieses Format überführt. Dazu kommen Krämpfe und Erkrankungen.

### 1.2 Besonderheiten (`lib/besonderheiten.ts`)
Feste Regeln, die täglich prüfen, ob etwas vom eigenen Normalbereich abweicht. Die Bereiche gibt es schon (`lib/baseline.ts`, mittlere Hälfte der letzten 30 Tage, in der zweiten Zyklushälfte mit eigenem Bereich).

| Besonderheit | Regel (Beispiel) | Art |
|---|---|---|
| Körper unter Druck | Ruhepuls 2 Tage über dem Bereich **und** HRV unter dem Bereich, ohne harten Trainingstag davor | auffällig |
| Vorbote einer Erkrankung | Gleiches Bild wie vor früheren Erkrankungen (aus dem Rückblick im Muster-Motor) | auffällig |
| Krämpfe häufen sich | Doppelt so viele Krampftage wie in den 4 Wochen davor | Warnzeichen → Arzt |
| Bedarfs-Hübe häufen sich | Mehr Bufori-Bedarfs-Hübe als im üblichen Bereich | Warnzeichen → Arzt (steht so in der Gebrauchsinformation) |
| Zyklus ungewöhnlich | Zyklus deutlich kürzer oder länger als die eigenen letzten 6 | auffällig |
| Belastung steigt schnell | Verhältnis 7 zu 28 Tagen über 1,3 (`lib/trainingLoad.ts`) | auffällig |
| Gute Phase | HRV seit 7 Tagen über dem Bereich, Schlaf gut | positiv |
| Fortschritt | neuer höchster Top beim Bouldern, Kettlebell-Gewicht gesteigert | positiv |
| Lücke | 3 Tage ohne Check-in oder Tagebuch, Garmin seit 2 Tagen ohne Daten | Hinweis |

Warnzeichen kommen **immer** aus diesen Regeln, nie aus der KI, und erscheinen auch, wenn der Coach ausgeschaltet ist.

### 1.3 Zusammenfassung nur mit dem, was gebraucht wird
`lib/coachContext.ts` wird in Teile zerlegt: Grundlage (Datum, Tagesziel, Zyklustag, Krankheit, Verletzung, Warnzeichen), Training, Zyklus und Symptome, Gesundheit und Mittel, Befunde, Besonderheiten. Je nach Anlass gehen nur die passenden Teile mit. Das entspricht der Regel „An die Claude-API geht nur, was eine Antwort wirklich braucht“ und senkt die Kosten.

### 1.4 Neue Tabelle `coach_hints`
Für alles, was der Coach von sich aus sagt.

| Feld | Bedeutung |
|---|---|
| `day`, `kind` | Tag und Art: `tag` · `besonderheit` · `woche` · `vorschlag` |
| `title`, `body` | kurzer Text |
| `basis` | welche Befunde und Besonderheiten zugrunde lagen (für „Warum?“) |
| `action` | optional ein Vorschlag zum Übernehmen, zum Beispiel eine Planänderung |
| `feedback` | hilfreich · nicht hilfreich · erledigt |
| `dismissed_at` | weggeklickt |
| Verbrauch | Token und Kosten wie bei `coach_messages` |

Zugriffsschutz pro Konto (Row Level Security).

### 1.5 Die Funktion `coach` bekommt Arten von Anfragen
`mode`: `chat` (wie heute) · `tag` · `woche` · `plan` · `eintrag` · `erklaeren`.
Die Anweisungen für jede Art liegen in der Funktion, nicht im Browser. Bei `plan` und `eintrag` antwortet der Coach in einem festen Format, das die App vor dem Anzeigen prüft (nur erlaubte Sportarten, Tage, Symptome).

---

## 2. Was der Coach damit tut

### 2.1 Tageshinweis auf Heute
- **Wann:** einmal am Tag, nach dem Morgen-Check-in oder dem ersten Garmin-Abruf, beim Öffnen von Heute.
- **Was:** 2 bis 4 Sätze: das Wichtigste für heute aus Tagesziel, Befunden, die heute zutreffen, und Besonderheiten. Dazu höchstens ein konkreter Vorschlag.
- *Beispiel (Beispieldaten):* „Heute ist Zyklustag 24. In dieser Phase hattest du zuletzt öfter nachts Wadenkrämpfe und eine niedrigere HRV. Für das Kettlebell-Training heute: wie geplant, ohne Zusatzsätze, danach die Waden dehnen und gut trinken.“
- **Ohne KI:** Ist der Coach aus oder das Netz weg, zeigt die Karte die Besonderheiten und Befunde als feste Sätze. Es fehlt nur die verbundene Formulierung.
- Unter dem Text: „Warum?“ (zeigt die Grundlage), „Hilfreich / Nicht hilfreich“, „Frag den Coach“.

### 2.2 Besonderheiten
- Erscheinen als kurze Zeile auf Heute und in der Liste Hinweise, mit fester Bedeutung: auffällig (Amber, mit Text), positiv (Sage, mit Text), Warnzeichen (mit Verweis auf ärztliche Abklärung).
- Tippt man darauf, erklärt der Coach in einfachen Worten, was dahintersteckt und was jetzt sinnvoll ist. Das ist eine Anfrage `erklaeren` und wird erst beim Tippen gestellt, nicht vorab.
- Push nur auf Wunsch und nur für feste Regeltexte, also ohne KI auf dem Server, zum Beispiel: „Dein Ruhepuls ist seit zwei Tagen erhöht. Magst du heute einen leichteren Tag einplanen?“

### 2.3 Wochenrückblick (Sonntagabend)
- Was lief: Einheiten gegen Plan, Belastung, Schlaf, Erholung, Symptome, Krämpfe, Zyklus.
- Was auffiel: neue oder stärker gewordene Muster.
- Was nächste Woche passt, mit Blick auf die erwartete Zyklusphase (die Vorhersage gibt es schon in `lib/cycle.ts`) und die Ziele: 5. Kyu, Bouldern 6A, Kraftaufbau mit der Kettlebell.
- Endet mit einem Vorschlag zum Übernehmen (siehe 2.4).

### 2.4 Woche planen und anpassen (Training)
- Auf der Seite Training ein Knopf „Woche mit dem Coach planen“.
- Der Coach sieht die Vorlage (Montag Karate, Mittwoch und Freitag Kettlebell, Samstag Bouldern), Krankheit, Verletzungen (`healthEffect`), erwartete Zyklusphase, Befunde und Belastung.
- Er schlägt Änderungen einzeln vor, zum Beispiel: „Freitag: Kettlebell leichter, weil es der dritte Tag vor der Periode ist und du dann öfter schlecht schläfst“. Jede Änderung hat einen eigenen Knopf „Übernehmen“. Ohne Tippen ändert sich nichts.
- Kettlebell: Vorschlag, ob das nächste Gewicht dran ist, aus den letzten Sätzen in `kb_sets`. Nur innerhalb der vorhandenen Kettlebells von 1 bis 20 kg.
- Karate: Vorbereitung auf den 5. Kyu über die Wochen bis zur Prüfung verteilen, mit Inhalten aus `karate_items`.

### 2.5 Erzählen statt tippen (Tagebuch)
- Ein Feld „Erzähl kurz, wie es dir geht“, auch per Diktierfunktion des Handys.
- *Beispiel (Beispieldaten):* „Heute Nacht Krampf in der linken Wade, wenig getrunken, ziemlich gestresst.“
- Der Coach macht daraus Vorschläge zum Abhaken: Krampf (links, nachts) · Einfluss „wenig getrunken“ · Einfluss „Stress“. Erst „Speichern“ legt die Einträge an.
- Der Text geht nur beim Tippen auf „Auswerten“ an die KI und wird danach nicht gespeichert, nur die bestätigten Einträge.

### 2.6 Muster erklären
- Jede Musterkarte (Zyklus, Weitere Muster, Gesundheit) bekommt „Frag den Coach“. Damit öffnet sich der Chat mit diesem Befund als Thema, zum Beispiel „Was kann ich an den Tagen vor der Periode gegen die Krämpfe tun?“.
- Der Coach antwortet mit allgemeinem Wissen (Dehnen, Trinken, Aufwärmen, Schlaf), ohne Diagnose und ohne Mengen für Mittel.

### 2.7 Selbstversuch
- Aus einem Befund kann man einen Versuch über 2 bis 4 Wochen starten, zum Beispiel „Abends 5 Minuten Waden dehnen“ oder „vor Kumite länger aufwärmen“.
- Die App hakt täglich ab, ob es gemacht wurde, und vergleicht am Ende mit der Zeit davor, mit der Regel „Zusammenhang, kein Beweis“.
- Versuche mit Medikamenten oder Supplements schlägt der Coach **nicht** vor. Wenn du selbst etwas änderst, zeigt die App nur den Vergleich davor und danach.

### 2.8 Begleitung nach Krankheit und Verletzung
- Die Stufen für den Wiedereinstieg (`RETURN_STEPS`) und die Regeln „über oder unter dem Hals“ (`illnessRule`) gibt es schon.
- Neu: Der Coach schaut täglich, ob Ruhepuls, HRV und Schmerzwert (`injury_pain`) den nächsten Schritt erlauben, und sagt das im Tageshinweis. Die Entscheidung bleibt bei dir. Bei Fieber gilt weiter: Pause.

### 2.9 Seitenbezug im Chat
- Der Coach weiß, von welcher Seite aus er geöffnet wurde, und zeigt passende Vorschlagsfragen statt der festen vier:
  - Heute: „Was passt heute?“
  - Training: „Ist das nächste Kettlebell-Gewicht dran?“
  - Zyklus: „Was ist in meiner Phase typisch für mich?“
  - Gesundheit: „Wann kann ich nach der Erkältung wieder klettern?“
- Dafür werden nur die passenden Teile der Zusammenfassung mitgeschickt (1.3).

### 2.10 Uhr (später)
Der erste Satz des Tageshinweises erscheint auf der Uhr neben dem Tagesziel. Der Text wird vorher in der App erzeugt, die Uhr fragt keine KI.

### Bewusst nicht dabei
- kein Arztbericht, keine Fragebögen, keine Laborwerte (Regeln der App)
- keine Ernährungspläne, keine Kalorien, kein Zielgewicht
- keine selbstständigen Änderungen ohne Bestätigung

---

## 3. Sicherheit und Datenschutz
- **Feste Regeln vor der KI:** Warnzeichen, Pause bei Fieber und gesperrte Sportarten bei Verletzungen kommen aus dem Code. Die KI bekommt sie als Vorgabe und darf ihnen nicht widersprechen.
- **Prüfung der Antwort:** Die Funktion prüft jede Antwort auf Mengenangaben zu Medikamenten (mg, Tabletten, Hübe pro Tag …) und auf Diagnosewörter. Trifft etwas zu, wird die Antwort nicht gezeigt, und es erscheint der Verweis an Apotheke oder Arztpraxis.
- **Medikamente:** Hinweise nur aus `MED_NOTES` mit Quelle. Was dort nicht steht, beantwortet der Coach mit „Bitte in der Apotheke fragen“.
- **Sparsam senden:** keine Notizen, keine Namen, keine einzelnen Einträge, sondern Zahlen und Befunde. Freitext nur bei „Erzählen statt tippen“ und nur auf Knopfdruck.
- **Schlüssel:** wie bisher nur in den Supabase-Secrets.

---

## 4. Kosten und Kontrolle
- **Einstellungen › Coach:** jede Art einzeln an oder aus: Tageshinweis, Besonderheiten erklären, Wochenrückblick, Planung, Erzählen statt tippen. Das Tageslimit gilt weiter, automatische Hinweise zählen extra und höchstens einmal pro Tag oder Woche.
- **Modell je Aufgabe:** Kurze Texte (Tageshinweis, Erklärung, Einträge erkennen) mit einem kleinen, günstigen Modell. Chat, Wochenrückblick und Planung mit dem bisherigen Modell. Beides lässt sich über Secrets einstellen.
- **Grobe Schätzung** nach den Preisen in der Funktion `coach`: Tageshinweis unter 1 Cent pro Tag, Wochenrückblick etwa 2 Cent pro Woche. Mit den Chatfragen bleibt das im Bereich weniger Euro pro Monat. Die tatsächlichen Kosten zeigt die App wie bisher in den Einstellungen.
- Die gleichbleibenden Anweisungen werden zwischengespeichert (Prompt-Caching). Das macht wiederholte Anfragen billiger.

---

## 5. Umsetzung in Schritten
Jeder Schritt ist ein eigener Pull Request. Voraussetzung ist der Muster-Motor aus dem Konzept zu den Krämpfen.

1. **Befunde und Besonderheiten** (nur App, ohne KI): `lib/muster.ts` im einheitlichen Format, `lib/besonderheiten.ts`, Anzeige auf Heute als feste Sätze.
2. **Zusammenfassung in Teilen und Seitenbezug im Chat**: kleinere Anfragen, passende Vorschlagsfragen, „Frag den Coach“ auf den Musterkarten.
3. **Tageshinweis und Hinweise mit Rückmeldung**: Migration `coach_hints`, Art `tag` in der Funktion `coach`, Prüfung der Antworten. *Braucht deine Freigabe (Migration und Supabase-Funktion).*
4. **Wochenrückblick und Planung mit „Übernehmen“** (Training).
5. **Erzählen statt tippen** (Tagebuch).
6. **Selbstversuch** und **Begleitung nach Krankheit**.
7. **Push für Besonderheiten** und **Uhr**.

---

## 6. Offene Fragen an dich
1. Soll der Tageshinweis **automatisch** erscheinen oder erst, wenn du auf „Was ist heute wichtig?“ tippst?
2. **Wochenrückblick:** Sonntagabend passend? Als Push-Mitteilung oder nur in der App?
3. **Planung:** Soll der Coach auch Tage tauschen dürfen (zum Beispiel Kettlebell von Freitag auf Donnerstag), oder nur leichter und schwerer machen? Montag bleibt immer Karate.
4. **Erzählen statt tippen:** Ist es für dich in Ordnung, dass dieser Text kurz an die KI geht, um daraus Einträge zu machen?
5. Welche **Besonderheiten** sind dir am wichtigsten? Welche sollen eine Push-Mitteilung auslösen?
6. Gibt es eine **monatliche Kostengrenze**, ab der der Coach nur noch Fragen beantwortet und keine automatischen Hinweise mehr schreibt?
