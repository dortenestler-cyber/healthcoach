// Karate-Prüfungsprogramm 5. bis 1. Kyu (docs/konzept-karate-pruefungen.md)
// Kennungen gelten über alle Grade: Was beim 5. Kyu sitzt, bleibt beim 4. Kyu abgehakt.
// Ein Wechsel des Verbands tauscht nur diese Datei.

export type Status = "offen" | "uebe" | "sitzt";
export type Gruppe = "Kihon" | "Kata" | "Anwendung" | "Kumite" | "Begriffe";
export const GRUPPEN: Gruppe[] = ["Kihon", "Kata", "Anwendung", "Kumite", "Begriffe"];
export const NEXT: Record<Status, Status> = { offen: "uebe", uebe: "sitzt", sitzt: "offen" };
export const STATUS_WORT: Record<Status, string> = { offen: "offen", uebe: "übe ich", sitzt: "sitzt" };

export type Teil = { key: string; name: string };
export type Punkt = { key: string; gruppe: Gruppe; name: string; de?: string; teile?: Teil[]; wiederholung?: boolean };
export type Grad = { kyu: number; guertel: string; punkte: Punkt[] };

// Prüfungsordnung Shotokan im Deutschen Karate Verband (DKV), in eigenen Worten zusammengefasst
export const QUELLE = {
  beispiel: false,
  text: "Nach der Prüfungsordnung Shotokan des DKV, in Kraft seit 01.01.2023, Stand 09.12.2025. Maßgeblich ist die Prüfungsordnung selbst.",
};
export const HINWEISE = [
  "Tritte Jodan, Armtechniken Chudan, alles 5-mal, wenn nichts anderes dasteht.",
  "Alle bisher gelernten Kata gehören zum Prüfungsstoff.",
];
export const KUERZEL = "ZK Zenkutsu-dachi · KK Kokutsu-dachi · KB Kiba-dachi · NA Neko-ashi-dachi · SD Sochin-dachi · YA Yori-ashi (Gleitschritt) · „/“ ohne Schritt · „v“ mit Schritt vor · „r“ mit Schritt zurück. Ohne Angabe: ZK.";

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const kataTeile = (key: string): Teil[] => [
  { key: `${key}.abfolge`, name: "Abfolge" },
  { key: `${key}.kiai`, name: "Kiai-Stellen" },
  { key: `${key}.rhythmus`, name: "Rhythmus" },
  { key: `${key}.staende`, name: "Stände" },
];
const kata = (name: string, extra: Partial<Punkt> = {}): Punkt => {
  const key = `kata.${slug(name)}`;
  return { key, gruppe: "Kata", name, teile: kataTeile(key), ...extra };
};
const HEIAN = ["Heian Shodan", "Heian Nidan", "Heian Sandan", "Heian Yondan", "Heian Godan"];
const rep = (names: string[]) => names.map((n) => kata(n, { wiederholung: true }));
const kihon = (kyu: number, list: (string | [string, string])[]): Punkt[] =>
  list.map((x, i) => {
    const [name, de] = typeof x === "string" ? [x, undefined] : x;
    return { key: `kihon.${kyu}.${i + 1}`, gruppe: "Kihon", name: `${i + 1}. ${name}`, de };
  });
const anwendung = (kyu: number, bunkai: number, aus: string): Punkt[] => [
  { key: `anwendung.${kyu}.kihon`, gruppe: "Anwendung", name: "2 Verteidigungen aus dem Kihon", de: "Mit Partner, realistisch angewendet" },
  { key: `anwendung.${kyu}.bunkai`, gruppe: "Anwendung", name: `${bunkai} Bunkai aus ${aus}`, de: "Anwendungen der Kata-Techniken" },
];
const kumite = (key: string, name: string, de: string, angriffe: string[]): Punkt => ({
  key, gruppe: "Kumite", name, de, teile: angriffe.map((n) => ({ key: `${key}.${slug(n)}`, name: n })),
});
const JIYU: Punkt = { key: "kumite.jiyu", gruppe: "Kumite", name: "Jiyu-Kumite", de: "Freier Kampf, Sieg oder Niederlage entscheiden nicht" };
const begriffe = (kyu: number, list: [string, string][]): Punkt[] =>
  list.map(([name, de]) => ({ key: `begriffe.${kyu}.${slug(name)}`, gruppe: "Begriffe", name, de: `${de} · zum Lernen, wird nicht geprüft` }));

export const PROGRAMM: Grad[] = [
  {
    kyu: 5,
    guertel: "blauer Gürtel",
    punkte: [
      ...kihon(5, [
        "Kizami-zuki (YA) v Oi-zuki, aus Kamae, mit Wendung",
        "Gyaku-zuki im Stand v Gyaku-zuki mit Schritt",
        ["Age-uke / Gyaku-age-empi, mit Wendung", "Abwehr oben, Ellbogen nach oben"],
        ["Gedan-barai / Gyaku-mawashi-empi, mit Wendung", "Abwehr unten, Ellbogen im Bogen"],
        ["KK Morote-uchi-ude-uke / ZK Gyaku-zuki", "Verstärkte Abwehr von innen"],
        ["KK Shuto-uke / ZK Gyaku-shuto-uchi Jodan, mit Wendung", "Handkantenabwehr, Handkantenschlag"],
        ["Mae-ashi-geri v Mawashi-geri, aus Kamae", "Tritt mit dem vorderen Bein, dann Halbkreistritt"],
        "Ushiro-geri rückwärts gehend, ohne Drehung",
      ]),
      kata("Heian Yondan"),
      ...rep(HEIAN.slice(0, 3)),
      ...anwendung(5, 2, "Heian Yondan"),
      kumite("kumite.kaeshi-5", "Kaeshi-Kumite", "Aus Kamae, seitliches Ausweichen zeigen", ["Jodan-zuki: Age-uke, Gyaku-zuki", "Chudan-zuki: Soto-ude-uke, Gyaku-zuki", "Mae-geri: Gedan-nagashi-uke, Gyaku-zuki"]),
      ...begriffe(5, [["Kommandos", "Yoi, Hajime, Yame, Mawate, Rei"], ["Angriffsstufen", "Jodan, Chudan, Gedan"], ["Stellungen", "Shizentai, Zenkutsu-, Kokutsu-, Kiba-dachi, Kamae"]]),
    ],
  },
  {
    kyu: 4,
    guertel: "blauer Gürtel",
    punkte: [
      ...kihon(4, [
        "Oi-zuki / Gyaku-zuki",
        "KK Uchi-ude-uke / ZK Gyaku-zuki, mit Wendung",
        "Age-uke / Soto-ude-uke mit demselben Arm / Gyaku-zuki",
        ["Shuto-uchi / Gyaku-haito-uchi, mit Wendung", "Handkante, Innenhandkante"],
        "Uraken / Yoko-geri kekomi (vorderes Bein, Beistellschritt) / Gyaku-zuki, mit Wendung",
        "Ushiro-geri, mit Wendung",
        ["KB Ura-mawashi-geri übersetzend (oder Ashi-barai aus ZK)", "Je 3-mal rechts und links"],
      ]),
      kata("Heian Godan"),
      ...rep(HEIAN.slice(0, 4)),
      ...anwendung(4, 2, "Heian Godan"),
      kumite("kumite.kaeshi-4", "Kaeshi-Kumite", "Mit Tai-sabaki (seitlich ausweichen), Konter frei", ["Jodan-zuki", "Chudan-zuki", "Mae-geri", "Mawashi-geri"]),
      ...begriffe(4, [["Namen der Techniken", "Abwehr (Uke), Stöße (Zuki), Schläge (Uchi), Tritte (Geri)"]]),
    ],
  },
  {
    kyu: 3,
    guertel: "brauner Gürtel",
    punkte: [
      ...kihon(3, [
        "Oi-zuki r Gedan-barai v Oi-zuki, mit Wendung",
        "Gyaku-zuki / Kizami-zuki im Stand v Gyaku-zuki aus Kamae",
        "KK Age-uke / Mae-ashi-geri / ZK Gyaku-zuki, mit Wendung",
        "Uchi-ude-uke / Gyaku-zuki / Kizami-zuki",
        "Mae-mawashi-geri / Ushiro-geri, mit Wendung",
        "KB 2-mal Yoko-geri keage (Beistellschritt) / Kekomi, nach der Wendung zweimal zurück",
        "Ura-mawashi-geri / Gyaku-zuki (oder Ashi-barai mit dem hinteren Bein / Gyaku-zuki), mit Wendung",
      ]),
      kata("Tekki Shodan"),
      ...rep(HEIAN),
      ...anwendung(3, 2, "Tekki Shodan"),
      kumite("kumite.jiyu-ippon-3", "Jiyu-Ippon-Kumite", "Mit Yori-ashi, je rechts und links", ["Kizami-zuki Jodan", "Gyaku-zuki Chudan", "Mae-geri Chudan", "Mawashi-geri", "Ushiro-geri Chudan"]),
      JIYU,
      ...begriffe(3, [["Kumite-Formen", "Gohon-, Kihon-Ippon-, Kaeshi-, Jiyu-Ippon-, Jiyu-Kumite"]]),
    ],
  },
  {
    kyu: 2,
    guertel: "brauner Gürtel",
    punkte: [
      ...kihon(2, [
        "Uraken-uchi / Gyaku-zuki",
        "NA Shuto-uke / Mae-ashi-geri / ZK Gyaku-tate-nukite, mit Wendung",
        "Soto-ude-uke / KB Yoko-empi / Yoko-uraken-uchi / ZK Gyaku-zuki, mit Wendung",
        "SD Uchi-ude-uke / ZK Gyaku-zuki",
        ["Ashi-barai (vorderes Bein) / Uraken-uchi v Mawashi-geri / Gyaku-zuki, mit Wendung", "Aus Chudan-Kamae"],
        ["Kizami-zuki YA / Gyaku-zuki v Ura-mawashi-geri (oder v Ashi-barai / Gyaku-zuki), mit Wendung", "Aus Chudan-Kamae"],
        ["Kizami-zuki YA / Ushiro-geri / Gyaku-zuki, mit Wendung", "Aus Chudan-Kamae"],
      ]),
      kata("Bassai Dai"),
      ...rep([...HEIAN, "Tekki Shodan"]),
      ...anwendung(2, 2, "Bassai Dai"),
      kumite("kumite.jiyu-ippon-2", "Jiyu-Ippon-Kumite", "Mit Yori-ashi vor, je rechts und links", ["Kizami-zuki Jodan / Gyaku-zuki Chudan", "Gyaku-zuki / Gyaku-zuki Jodan", "Ura-mawashi-geri (oder Ushiro-geri)", "Kizami-zuki Jodan / Mawashi-geri vorderes Bein"]),
      JIYU,
      ...begriffe(2, [["Kiai, Kime, Hikite", "Kampfschrei, volle Spannung, Faust zur Hüfte zurück"], ["Zanshin, Tai-sabaki", "Wachsamkeit nach der Technik, Ausweichen"]]),
    ],
  },
  {
    kyu: 1,
    guertel: "brauner Gürtel",
    punkte: [
      ...kihon(1, [
        ["Kizami-zuki (YA) / Gyaku-zuki v Oi-zuki", "Alles Kihon aus Kamae"],
        "KK Gedan-barai / Uraken mit demselben Arm / ZK Gyaku-zuki, mit Wendung",
        ["Abwehr-Reihe rückwärts in SD, jeweils mit ZK Gyaku-zuki, mit Wendung", "Age-uke, Soto-uke, Uchi-ude-uke, Tate-shuto-uke, Gedan-barai"],
        "KK Shuto-uke / ZK Shuto-uchi mit demselben Arm / Mae-geri, hinten absetzen / ZK Gyaku-haito-uchi",
        "Oi-zuki r (YA) NA Jodan Te-nagashi-uke / Mae-mawashi-geri / Gyaku-zuki, mit Wendung",
        "Kizami-zuki (YA) / Ushiro-geri / Uraken / Gyaku-zuki, mit Wendung",
        "Ura-mawashi-geri (oder Yoko-geri kekomi) mit dem hinteren Bein, mit Wendung",
      ]),
      kata("Wahlkata", { de: "Jion, Kanku Dai, Empi oder Hangetsu" }),
      ...rep([...HEIAN, "Tekki Shodan", "Bassai Dai"]),
      ...anwendung(1, 3, "der Wahlkata"),
      kumite("kumite.jiyu-ippon-1", "Jiyu-Ippon-Kumite", "Mit Schritt oder Yori-ashi, je rechts und links", ["Oi-zuki Jodan", "Kizami-zuki", "Uraken / Gyaku-zuki Chudan", "Mawashi-geri vorderes oder hinteres Bein", "Ushiro-geri oder Ushiro-ura-mawashi-geri"]),
      JIYU,
      ...begriffe(1, [["Schritte", "Suri-ashi, Yori-ashi (Gleitschritte), Kai-ashi (ganzer Schritt)"]]),
    ],
  },
];

export const grad = (kyu: number) => PROGRAMM.find((g) => g.kyu === kyu) ?? PROGRAMM[0];

// Stand eines Punktes: das Höhere aus eigenem Stand und Teilen (alle Teile sitzen → sitzt, einer begonnen → übe ich)
const RANG: Record<Status, number> = { offen: 0, uebe: 1, sitzt: 2 };
export function stand(p: Punkt, m: Map<string, Status>): Status {
  const own = m.get(p.key) ?? "offen";
  if (!p.teile?.length) return own;
  const t = p.teile.map((x) => m.get(x.key) ?? "offen");
  const aus: Status = t.every((s) => s === "sitzt") ? "sitzt" : t.some((s) => s !== "offen") ? "uebe" : "offen";
  return RANG[aus] > RANG[own] ? aus : own;
}

const liste = (w: string[]) => (w.length < 2 ? w[0] : w.slice(0, -1).join(", ") + " und " + w[w.length - 1]);

// Ein Satz, der das Ergebnis nennt
export function satz(gruppen: { gruppe: string; sitzt: number; total: number }[]): string {
  const mit = gruppen.filter((g) => g.total > 0);
  const fertig = mit.filter((g) => g.sitzt === g.total).map((g) => g.gruppe);
  const offen = mit.filter((g) => g.sitzt < g.total).map((g) => g.gruppe);
  if (!mit.length) return "";
  if (!offen.length) return "Alles sitzt. Du bist bereit für die Prüfung.";
  if (!mit.some((g) => g.sitzt > 0)) return "Noch nichts abgehakt. Fang mit einem Punkt an.";
  if (!fertig.length) return `Überall fehlt noch etwas, am meisten bei ${[...mit].sort((a, b) => a.sitzt / a.total - b.sitzt / b.total)[0].gruppe}.`;
  return `${liste(fertig)} ${fertig.length > 1 ? "sitzen" : "sitzt"}, bei ${liste(offen)} fehlt noch etwas.`;
}
