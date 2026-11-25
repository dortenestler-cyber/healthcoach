# Konzept: Karate-Prüfungen mit Prüfungsprogramm zum Abhaken

Stand: 25.11.2026 · Status: **Freigegeben (25.11.), umgesetzt in PR #143 mit dem Programm nach DKV Shotokan**

## Ziel
1. Für jede Prüfung ab dem 5. Kyu bis zum 1. Kyu steht das Prüfungsprogramm schon in der App: Kihon, Kata, Kumite.
2. Du hakst ab, was sitzt. Die App zeigt, wie viel für die nächste Prüfung schon sicher ist und was noch fehlt.
3. Eigene Punkte (Hinweise vom Trainer, Schwachstellen) bleiben möglich, wie heute.
4. Nach einer bestandenen Prüfung rückt automatisch der nächste Kyu nach.

Heute gibt es auf Training › Karate eine leere Liste „Meine Prüfungsliste“ für den 5. Kyu, die man selbst füllt (`components/training/KarateSection.tsx`, Tabelle `karate_items`). Das Konzept baut darauf auf.

---

## 1. Entscheidungen (25.11.)

1. **Verband**: Deutscher Karate Verband (DKV), Stilrichtung Shotokan. Entwurf in Abschnitt 2, wird erst nach deiner Durchsicht in die App übernommen.
2. **Drei Stufen** pro Punkt: *offen · übe ich · sitzt*. „Abhaken“ heißt *sitzt*.
3. **Kata in Teilen**: Jede Kata lässt sich aufklappen in Abfolge, Kiai-Stellen, Rhythmus und Stände, jeder Teil mit eigener Stufe. Die Kata gilt als *sitzt*, wenn alle Teile sitzen, sie lässt sich aber auch direkt setzen.
4. **Begriffe und Theorie** kommen als eigene Gruppe dazu (z. B. Zählen, Namen der Techniken und Stände, Dojo-Kun), Inhalt nach deiner Prüfungsordnung.

---

## 2. Prüfungsprogramm nach DKV Shotokan

> **Von der Nutzerin am 25.11. freigegeben.** Grundlage: Prüfungsordnung Shotokan im Deutschen Karate Verband, in Kraft seit 01.01.2023, redaktionell geändert am 20.03.2024 und 09.12.2025 (karate.de › Service › Downloads › Prüfungswesen). In eigenen, kurzen Worten zusammengefasst; maßgeblich ist die Prüfungsordnung selbst.

**Was für alle Grade gilt (steht in der App über Kihon)**
- Tritte Jodan, Armtechniken Chudan, jede Technik oder Kombination 5-mal, wenn nichts anderes dasteht.
- Alle bisher gelernten Kata gehören zum Prüfungsstoff (Gruppe „Wiederholung“).
- Zu jeder Prüfung gehören Kihon, Kata, Kumite und Anwendung (Bunkai).
- Im Kumite zählt Zanshin, die Aufmerksamkeit nach der Technik.

Kürzel: ZK Zenkutsu-dachi · KK Kokutsu-dachi · KB Kiba-dachi · NA Neko-ashi-dachi · SD Sochin-dachi · YA Yori-ashi (Gleitschritt) · „/“ ohne Schritt · „v“ mit Schritt vor · „r“ mit Schritt zurück. Ohne Angabe: ZK.

**Neu gegenüber dem ersten Entwurf**: eigene Gruppe **Anwendung** (Verteidigung aus dem Kihon und Bunkai aus der Kata), weil der DKV sie in jeder Prüfung verlangt. Kihon-Punkte gelten je Grad, weil sich die Kombinationen von Grad zu Grad ändern. Kata behalten ihren Haken über alle Grade.

### 5. Kyu · blauer Gürtel
**Kihon**
1. Kizami-zuki (YA) v Oi-zuki, aus Kamae, mit Wendung
2. Gyaku-zuki im Stand v Gyaku-zuki mit Schritt
3. Age-uke / Gyaku-age-empi, mit Wendung · Abwehr oben, Ellbogen nach oben
4. Gedan-barai / Gyaku-mawashi-empi, mit Wendung · Abwehr unten, Ellbogen im Bogen
5. KK Morote-uchi-ude-uke / ZK Gyaku-zuki · verstärkte Abwehr von innen
6. KK Shuto-uke / ZK Gyaku-shuto-uchi Jodan, mit Wendung · Handkante
7. Mae-ashi-geri v Mawashi-geri, aus Kamae · Tritt mit dem vorderen Bein, dann Halbkreistritt
8. Ushiro-geri rückwärts gehend, ohne Drehung

**Kata**: Heian Yondan · Wiederholung: Heian Shodan, Nidan, Sandan
**Anwendung**: 2 Verteidigungen mit Partner aus dem Kihon · 2 Bunkai aus Heian Yondan
**Kumite**: Kaeshi-Kumite aus Kamae, Teile: Jodan-zuki (Age-uke, Gyaku-zuki) · Chudan-zuki (Soto-ude-uke, Gyaku-zuki) · Mae-geri (Gedan-nagashi-uke, Gyaku-zuki) · seitliches Ausweichen zeigen

### 4. Kyu · blauer Gürtel
**Kihon**
1. Oi-zuki / Gyaku-zuki
2. KK Uchi-ude-uke / ZK Gyaku-zuki, mit Wendung
3. Age-uke / Soto-ude-uke mit demselben Arm / Gyaku-zuki
4. Shuto-uchi / Gyaku-haito-uchi, mit Wendung · Handkante, Innenhandkante
5. Uraken / Yoko-geri kekomi (vorderes Bein, Beistellschritt) / Gyaku-zuki, mit Wendung
6. Ushiro-geri, mit Wendung
7. KB Ura-mawashi-geri übersetzend (oder Ashi-barai aus ZK), 3-mal rechts, 3-mal links

**Kata**: Heian Godan · Wiederholung: Heian Shodan bis Yondan
**Anwendung**: 2 Verteidigungen aus dem Kihon · 2 Bunkai aus Heian Godan
**Kumite**: Kaeshi-Kumite mit Tai-sabaki (seitlich ausweichen), Konter frei, Teile: Jodan-zuki · Chudan-zuki · Mae-geri · Mawashi-geri

### 3. Kyu · brauner Gürtel
**Kihon**
1. Oi-zuki r Gedan-barai v Oi-zuki, mit Wendung
2. Gyaku-zuki / Kizami-zuki im Stand v Gyaku-zuki aus Kamae
3. KK Age-uke / Mae-ashi-geri / ZK Gyaku-zuki, mit Wendung
4. Uchi-ude-uke / Gyaku-zuki / Kizami-zuki
5. Mae-mawashi-geri / Ushiro-geri, mit Wendung
6. KB 2-mal Yoko-geri keage (Beistellschritt) / Kekomi, nach der Wendung zweimal zurück
7. Ura-mawashi-geri / Gyaku-zuki (oder Ashi-barai mit dem hinteren Bein / Gyaku-zuki), mit Wendung

**Kata**: Tekki Shodan · Wiederholung: Heian Shodan bis Godan
**Anwendung**: 2 Verteidigungen aus dem Kihon · 2 Bunkai aus Tekki Shodan
**Kumite**: Jiyu-Ippon-Kumite mit Yori-ashi, je rechts und links, Teile: Kizami-zuki Jodan · Gyaku-zuki Chudan · Mae-geri Chudan · Mawashi-geri · Ushiro-geri Chudan · dazu Jiyu-Kumite

### 2. Kyu · brauner Gürtel
**Kihon**
1. Uraken-uchi / Gyaku-zuki
2. NA Shuto-uke / Mae-ashi-geri / ZK Gyaku-tate-nukite, mit Wendung
3. Soto-ude-uke / KB Yoko-empi / Yoko-uraken-uchi / ZK Gyaku-zuki, mit Wendung
4. SD Uchi-ude-uke / ZK Gyaku-zuki
5. aus Chudan-Kamae: Ashi-barai (vorderes Bein) / Uraken-uchi v Mawashi-geri / Gyaku-zuki, mit Wendung
6. aus Chudan-Kamae: Kizami-zuki YA / Gyaku-zuki v Ura-mawashi-geri (oder v Ashi-barai / Gyaku-zuki), mit Wendung
7. aus Chudan-Kamae: Kizami-zuki YA / Ushiro-geri / Gyaku-zuki, mit Wendung

**Kata**: Bassai Dai · Wiederholung: Heian Shodan bis Godan, Tekki Shodan
**Anwendung**: 2 Verteidigungen aus dem Kihon · 2 Bunkai aus Bassai Dai
**Kumite**: Jiyu-Ippon-Kumite mit Yori-ashi vor, je rechts und links, Teile: Kizami-zuki Jodan / Gyaku-zuki Chudan · Gyaku-zuki / Gyaku-zuki Jodan · Ura-mawashi-geri (oder Ushiro-geri) · Kizami-zuki Jodan / Mawashi-geri mit dem vorderen Bein · dazu Jiyu-Kumite

### 1. Kyu · brauner Gürtel
**Kihon** (alles aus Kamae)
1. Kizami-zuki (YA) / Gyaku-zuki v Oi-zuki
2. KK Gedan-barai / Uraken mit demselben Arm / ZK Gyaku-zuki, mit Wendung
3. Abwehr-Reihe rückwärts in SD, jeweils mit ZK Gyaku-zuki: Age-uke, Soto-uke, Uchi-ude-uke, Tate-shuto-uke, Gedan-barai, mit Wendung
4. KK Shuto-uke / ZK Shuto-uchi mit demselben Arm / Mae-geri, hinten absetzen / ZK Gyaku-haito-uchi
5. Oi-zuki r (YA) NA Jodan Te-nagashi-uke / Mae-mawashi-geri / Gyaku-zuki, mit Wendung
6. Kizami-zuki (YA) / Ushiro-geri / Uraken / Gyaku-zuki, mit Wendung
7. Ura-mawashi-geri (oder Yoko-geri kekomi) mit dem hinteren Bein, mit Wendung

**Kata**: Wahlkata aus Jion, Kanku Dai, Empi, Hangetsu · Wiederholung: Heian Shodan bis Godan, Tekki Shodan, Bassai Dai
**Anwendung**: 2 Verteidigungen aus dem Kihon · 3 Bunkai aus der Wahlkata
**Kumite**: Jiyu-Ippon-Kumite, je rechts und links, Teile: Oi-zuki Jodan · Kizami-zuki · Uraken / Gyaku-zuki Chudan · Mawashi-geri (vorderes oder hinteres Bein) · Ushiro-geri oder Ushiro-ura-mawashi-geri · dazu Jiyu-Kumite

### Begriffe
Der DKV fragt keine Theorie ab, die Prüfungsordnung hat aber ein Verzeichnis der Begriffe. Deshalb eine Gruppe „Begriffe“ zum Lernen, nicht zur Prüfung, verteilt auf die Grade. Sie zählt nicht im Ring „x von y sitzen“:
- 5. Kyu: Kommandos (Yoi, Hajime, Yame, Mawate, Rei) · Angriffsstufen (Jodan, Chudan, Gedan) · Stellungen
- 4. Kyu: Namen der Techniken (Abwehr, Stöße, Schläge, Tritte)
- 3. Kyu: Trainings- und Kampfformen (Gohon-, Kihon-Ippon-, Kaeshi-, Jiyu-Ippon-, Jiyu-Kumite)
- 2. Kyu: Kiai, Kime, Hikite, Zanshin, Tai-sabaki
- 1. Kyu: Schritte und Gleitschritte (Suri-ashi, Yori-ashi, Kai-ashi)

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
- **Gruppen** Kihon, Kata, Kumite, Begriffe, Eigene Punkte. Kata klappen auf in ihre Teile. Jede Zeile: japanischer Name, darunter kurz auf Deutsch, was gemeint ist. Tipp auf die ganze Zeile (mindestens 44 px) wechselt *offen → übe ich → sitzt*. Zustand steht immer als Wort oder Zeichen dabei, nicht nur als Farbe.
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

**Prüfungsprogramm im Code**, nicht in der Datenbank: `lib/karate/programm.ts` mit Verband, Stand, Quelle und je Kyu den Punkten mit fester Kennung (z. B. `5kyu.kihon.sanbon-zuki`), Gruppe (Kihon, Kata, Kumite, Begriffe), Name, deutscher Erklärung, bei Kata die Teile (Kennung z. B. `5kyu.kata.heian-godan.kiai`). Ein späterer Wechsel des Verbands tauscht nur diese Datei.

**Fortschritt in der Datenbank** (Migration durch die Rolle Daten, wartet auf Freigabe):

| Tabelle | Felder |
|---|---|
| `karate_progress` (neu) | `user_id`, `item_key` (Kennung aus dem Programm), `status` (offen · uebe · sitzt), `updated_at`; eindeutig je Konto und Kennung |
| `karate_items` (vorhanden) | neu: `kyu` (1–5, Standard 5 für alte Einträge), `status` wie oben statt `done` (alte Haken werden zu *sitzt*) |

Row Level Security wie bei allen Tabellen. Aktueller Grad und Prüfungen (Datum, bestanden am) liegen in den vorhandenen Einstellungen neben `examDate`, das übernommen wird.

**Aufteilung**: Daten `[DA]` schreibt die Migration. Oberfläche `[OF]` baut `lib/karate/programm.ts` und die Karte in `KarateSection.tsx`.

## 6. Nächste Schritte
1. ☑ Fragen beantwortet. Offen: Du schickst die Prüfungsordnung.
2. Ich passe das Programm in Abschnitt 2 an und markiere es als bestätigt.
3. ☑ Freigegeben am 25.11., Migration und Oberfläche zusammen in PR #143.
