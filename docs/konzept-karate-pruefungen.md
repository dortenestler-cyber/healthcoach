# Konzept: Karate-Prüfungen mit Prüfungsprogramm zum Abhaken

Stand: 25.11.2026 · Status: **Entwurf, wartet auf Antworten und Freigabe**

## Ziel
1. Für jede Prüfung ab dem 5. Kyu bis zum 1. Kyu steht das Prüfungsprogramm schon in der App: Kihon, Kata, Kumite.
2. Du hakst ab, was sitzt. Die App zeigt, wie viel für die nächste Prüfung schon sicher ist und was noch fehlt.
3. Eigene Punkte (Hinweise vom Trainer, Schwachstellen) bleiben möglich, wie heute.
4. Nach einer bestandenen Prüfung rückt automatisch der nächste Kyu nach.

Heute gibt es auf Training › Karate eine leere Liste „Meine Prüfungsliste“ für den 5. Kyu, die man selbst füllt (`components/training/KarateSection.tsx`, Tabelle `karate_items`). Das Konzept baut darauf auf.

---

## 1. Offene Fragen an dich

1. **Welcher Verband?** Die Prüfungsordnungen unterscheiden sich, vor allem im Kihon und darin, welche Kata zu welchem Kyu gehört (z. B. DJKB/JKA, DKV Shotokan, SKID). Am sichersten: Du schickst mir die Prüfungsordnung deines Dojos (PDF oder Foto), dann übernehme ich sie Punkt für Punkt.
2. **Zwei Stufen oder drei?** Vorschlag: drei Stufen pro Punkt, *offen · übe ich · sitzt*. „Abhaken“ heißt *sitzt*. Alternative: nur Haken.
3. **Kata in Teilen?** Vorschlag: Eine Kata ist ein Punkt. Auf Wunsch lässt sie sich aufklappen in Teile (Abfolge, Kiai-Stellen, Rhythmus, Stände), die man einzeln abhakt.
4. **Begriffe und Theorie** (Zählen, Namen der Techniken, Dojo-Kun): mit aufnehmen, falls dein Dojo das abfragt?

---

## 2. Prüfungsprogramm (Vorlage)

> **Beispielinhalt, nicht verbindlich.** Die Liste unten folgt dem verbreiteten Programm nach JKA/DJKB. Sie wird erst übernommen, wenn du den Verband bestätigt oder deine Prüfungsordnung geschickt hast. In der App steht über jeder Liste, nach welcher Ordnung sie gilt, mit Stand.

Kihon wird jeweils mehrmals vorwärts bzw. rückwärts gelaufen. Tritte meist beidseitig.

### 5. Kyu
**Kihon**
- Sanbon-zuki, vorwärts (Zenkutsu-dachi) · dreifacher Fauststoß
- Age-uke, Gyaku-zuki, rückwärts · Abwehr nach oben, Gegenstoß
- Soto-uke, Yoko-empi-uchi (Kiba-dachi), Uraken, Gyaku-zuki (Zenkutsu-dachi), vorwärts
- Uchi-uke, Kizami-zuki, Gyaku-zuki, rückwärts
- Shuto-uke (Kokutsu-dachi), Kizami-mae-geri, Nukite, vorwärts
- Mae-geri Ren-geri (Chudan, Jodan)
- Mawashi-geri
- Yoko-geri Keage und Yoko-geri Kekomi (Kiba-dachi)

**Kata**
- Heian Godan
- Wiederholung auf Zuruf: Heian Shodan bis Yondan

**Kumite**
- Kihon Ippon Kumite: Jodan Oi-zuki, Chudan Oi-zuki, Mae-geri, Yoko-geri Kekomi, jeweils rechts und links

### 4. Kyu
**Kihon** wie 5. Kyu, dazu:
- Ushiro-geri
- Kombination: Mae-geri, Oi-zuki, Gyaku-zuki

**Kata**
- Tekki Shodan
- Wiederholung: Heian Shodan bis Godan

**Kumite**
- Kihon Ippon Kumite, alle Angriffe, mit sauberem Abstand und Kime

### 3. Kyu
**Kihon** wie 4. Kyu, dazu:
- Kombinationen mit Tritten, z. B. Mae-geri, Mawashi-geri, Gyaku-zuki
- Tritt-Kombination auf einem Bein (z. B. Yoko-geri Keage, Yoko-geri Kekomi)

**Kata**
- Bassai Dai
- Wiederholung: Heian und Tekki Shodan

**Kumite**
- Jiyu Ippon Kumite: Jodan, Chudan, Mae-geri, Yoko-geri Kekomi, Mawashi-geri

### 2. Kyu
**Kihon** wie 3. Kyu, Kombinationen schneller und mit Richtungswechsel

**Kata**
- Wahlkata: Kanku Dai, Enpi oder Jion
- Wiederholung: Bassai Dai, Heian, Tekki Shodan

**Kumite**
- Jiyu Ippon Kumite, alle Angriffe

### 1. Kyu
**Kihon** wie 2. Kyu, freie Kombinationen nach Ansage

**Kata**
- Wahlkata (Tokui-Kata): Bassai Dai, Kanku Dai, Enpi oder Jion
- Eine weitere Kata nach Wahl des Prüfers

**Kumite**
- Jiyu Kumite (freier Kampf)

---

## 3. So sieht es in der App aus

Ort: **Training › Karate**, die Karte „Meine Prüfungsliste“ wird zu „Prüfungsprogramm“. Farbe Slate-Blau (Training).

```
┌───────────────────────────────────────────┐
│ Prüfung zum 5. Kyu          noch 14 Wochen │
│ Samstag, 6. März 2027                      │
│                                            │
│   ◯ 11 von 19       Heian Godan sitzt,     │
│     sitzen          Kumite fehlt noch.     │
├───────────────────────────────────────────┤
│ [5. Kyu] [4.] [3.] [2.] [1.]               │
├───────────────────────────────────────────┤
│ KIHON                         6 von 8      │
│ ✓ Sanbon-zuki vorwärts                     │
│   Dreifacher Fauststoß                     │
│ ◐ Shuto-uke, Kizami-mae-geri, Nukite       │
│   übe ich                                  │
│ ○ Yoko-geri Keage und Kekomi               │
├───────────────────────────────────────────┤
│ KATA · KUMITE · EIGENE PUNKTE …            │
│ Nach Prüfungsordnung DJKB, Stand 2025      │
└───────────────────────────────────────────┘
```

- **Kopf**: Prüfung, Datum, Wochen bis dahin (wie heute). Daneben ein dezenter Ring mit Zahl und Wort („11 von 19 sitzen“) und ein Satz, der das Ergebnis nennt („Kata sitzt, Kumite fehlt noch“).
- **Kyu-Auswahl**: Chips 5. bis 1. Kyu. Vorausgewählt ist die nächste Prüfung. Bestandene Grade tragen „bestanden am …“. Spätere Grade kann man schon ansehen und vorab abhaken.
- **Gruppen** Kihon, Kata, Kumite, Eigene Punkte. Jede Zeile: japanischer Name, darunter kurz auf Deutsch, was gemeint ist. Tipp auf die ganze Zeile (mindestens 44 px) wechselt *offen → übe ich → sitzt*. Zustand steht immer als Wort oder Zeichen dabei, nicht nur als Farbe.
- **Wiederholung**: Ältere Kata (z. B. Heian Shodan bis Yondan beim 5. Kyu) stehen in einer eingeklappten Gruppe „Wiederholung“. Was beim letzten Kyu schon „sitzt“ war, bleibt abgehakt.
- **Eigene Punkte**: wie heute frei eintragen, jetzt mit Zuordnung zum Kyu.
- **Prüfung bestanden**: Knopf im Kopf nach dem Prüfungsdatum. Danach ist der nächste Kyu die aktuelle Prüfung, das Datum ist wieder offen.
- **Verletzung**: Der vorhandene Hinweis („Für den 5. Kyu üben: …“) nennt künftig den aktuellen Kyu.

## 4. Später möglich (nicht Teil der ersten Umsetzung)
- Nach einer Karate-Einheit antippen, was geübt wurde. Daraus „zuletzt geübt vor 9 Tagen“ pro Punkt.
- Der Coach kennt die offenen Punkte und schlägt für die Woche zwei, drei davon vor. An die Claude-API gehen nur die Namen der Punkte und ihr Zustand.
- Kurze Notiz pro Punkt (z. B. „Hüfte früher eindrehen“).

---

## 5. Technik

**Prüfungsprogramm im Code**, nicht in der Datenbank: `lib/karate/programm.ts` mit Verband, Stand, Quelle und je Kyu den Punkten mit fester Kennung (z. B. `5kyu.kihon.sanbon-zuki`), Gruppe, Name, deutscher Erklärung. Ein späterer Wechsel des Verbands tauscht nur diese Datei.

**Fortschritt in der Datenbank** (Migration durch die Rolle Daten, wartet auf Freigabe):

| Tabelle | Felder |
|---|---|
| `karate_progress` (neu) | `user_id`, `item_key` (Kennung aus dem Programm), `status` (offen · uebe · sitzt), `updated_at`; eindeutig je Konto und Kennung |
| `karate_items` (vorhanden) | neu: `kyu` (1–5, Standard 5 für alte Einträge), `status` wie oben statt `done` (alte Haken werden zu *sitzt*) |

Row Level Security wie bei allen Tabellen. Aktueller Grad und Prüfungen (Datum, bestanden am) liegen in den vorhandenen Einstellungen neben `examDate`, das übernommen wird.

**Aufteilung**: Daten `[DA]` schreibt die Migration. Oberfläche `[OF]` baut `lib/karate/programm.ts` und die Karte in `KarateSection.tsx`.

## 6. Nächste Schritte
1. Du beantwortest die Fragen in Abschnitt 1, am besten mit deiner Prüfungsordnung.
2. Ich passe das Programm in Abschnitt 2 an und markiere es als bestätigt.
3. Nach deiner Freigabe: Migration (Daten), dann Oberfläche, je ein Pull Request.
