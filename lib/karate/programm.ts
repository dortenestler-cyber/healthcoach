// Karate-Prüfungsprogramm 5. bis 1. Kyu (docs/konzept-karate-pruefungen.md)
// Kennungen gelten über alle Grade: Was beim 5. Kyu sitzt, bleibt beim 4. Kyu abgehakt.
// Ein Wechsel des Verbands tauscht nur diese Datei.

export type Status = "offen" | "uebe" | "sitzt";
export type Gruppe = "Kihon" | "Kata" | "Kumite" | "Begriffe";
export const GRUPPEN: Gruppe[] = ["Kihon", "Kata", "Kumite", "Begriffe"];
export const NEXT: Record<Status, Status> = { offen: "uebe", uebe: "sitzt", sitzt: "offen" };
export const STATUS_WORT: Record<Status, string> = { offen: "offen", uebe: "übe ich", sitzt: "sitzt" };

export type Teil = { key: string; name: string };
export type Punkt = { key: string; gruppe: Gruppe; name: string; de?: string; teile?: Teil[]; wiederholung?: boolean };
export type Grad = { kyu: number; punkte: Punkt[] };

// Beispielinhalt, bis die Prüfungsordnung des Dojos eingetragen ist
export const QUELLE = { beispiel: true, text: "Vorlage nach dem verbreiteten Programm von JKA/DJKB, noch nicht mit deiner Prüfungsordnung abgeglichen" };

const kataTeile = (key: string): Teil[] => [
  { key: `${key}.abfolge`, name: "Abfolge" },
  { key: `${key}.kiai`, name: "Kiai-Stellen" },
  { key: `${key}.rhythmus`, name: "Rhythmus" },
  { key: `${key}.staende`, name: "Stände" },
];
const kata = (slug: string, name: string, extra: Partial<Punkt> = {}): Punkt => ({ key: `kata.${slug}`, gruppe: "Kata", name, teile: kataTeile(`kata.${slug}`), ...extra });
const k = (slug: string, name: string, de?: string): Punkt => ({ key: `kihon.${slug}`, gruppe: "Kihon", name, de });
const b = (slug: string, name: string, de?: string): Punkt => ({ key: `begriffe.${slug}`, gruppe: "Begriffe", name, de });
const teile = (key: string, names: string[]): Teil[] => names.map((n) => ({ key: `${key}.${n.toLowerCase().replace(/[^a-z]+/g, "-")}`, name: n }));

const KIHON_5: Punkt[] = [
  k("sanbon-zuki", "Sanbon-zuki vorwärts", "Dreifacher Fauststoß im Zenkutsu-dachi"),
  k("age-uke-gyaku-zuki", "Age-uke, Gyaku-zuki rückwärts", "Abwehr nach oben, Gegenstoß"),
  k("soto-uke-empi", "Soto-uke, Yoko-empi-uchi, Uraken, Gyaku-zuki vorwärts", "Abwehr von außen, Ellbogen im Kiba-dachi, Faustrücken, Gegenstoß"),
  k("uchi-uke-kizami", "Uchi-uke, Kizami-zuki, Gyaku-zuki rückwärts", "Abwehr von innen, Stoß mit der vorderen Hand, Gegenstoß"),
  k("shuto-uke-nukite", "Shuto-uke, Kizami-mae-geri, Nukite vorwärts", "Handkantenabwehr im Kokutsu-dachi, Tritt mit dem vorderen Bein, Fingerstich"),
  k("mae-geri-ren", "Mae-geri Ren-geri", "Zwei Fußtritte nach vorn, Chudan und Jodan"),
  k("mawashi-geri", "Mawashi-geri", "Halbkreisfußtritt"),
  k("yoko-geri", "Yoko-geri Keage und Kekomi", "Seitwärtstritt geschnappt und gestoßen, im Kiba-dachi"),
];
const KIHON_4: Punkt[] = [
  k("ushiro-geri", "Ushiro-geri", "Tritt nach hinten"),
  k("kombi-mae-oi-gyaku", "Mae-geri, Oi-zuki, Gyaku-zuki", "Tritt und zwei Stöße in Folge"),
];
const KIHON_3: Punkt[] = [
  k("kombi-mae-mawashi", "Mae-geri, Mawashi-geri, Gyaku-zuki", "Zwei Tritte und Gegenstoß"),
  k("kombi-yoko-ein-bein", "Yoko-geri Keage und Kekomi auf einem Bein", "Zwei Seitwärtstritte, ohne abzusetzen"),
];
const KIHON_2: Punkt[] = [k("kombi-richtung", "Kombinationen mit Richtungswechsel", "Schneller und mit Drehung")];
const KIHON_1: Punkt[] = [k("kombi-frei", "Freie Kombinationen nach Ansage")];

const KIHON_IPPON: Punkt = { key: "kumite.kihon-ippon", gruppe: "Kumite", name: "Kihon Ippon Kumite", de: "Ein Angriff nach Ansage, Abwehr und Gegenangriff, rechts und links", teile: teile("kumite.kihon-ippon", ["Jodan", "Chudan", "Mae-geri", "Yoko-geri Kekomi"]) };
const JIYU_IPPON: Punkt = { key: "kumite.jiyu-ippon", gruppe: "Kumite", name: "Jiyu Ippon Kumite", de: "Ein Angriff aus freier Bewegung, Abwehr und Gegenangriff", teile: teile("kumite.jiyu-ippon", ["Jodan", "Chudan", "Mae-geri", "Yoko-geri Kekomi", "Mawashi-geri"]) };
const JIYU: Punkt = { key: "kumite.jiyu", gruppe: "Kumite", name: "Jiyu Kumite", de: "Freier Kampf" };

const heian = (bis: number) =>
  ["Shodan", "Nidan", "Sandan", "Yondan", "Godan"].slice(0, bis).map((n) => kata(`heian-${n.toLowerCase()}`, `Heian ${n}`, { wiederholung: true }));

const BEGRIFFE_5: Punkt[] = [
  b("zaehlen", "Zählen bis zehn", "Ichi, Ni, San … Ju"),
  b("kommandos", "Gruß und Kommandos", "Rei, Yoi, Hajime, Yame, Mawatte"),
  b("staende", "Namen der Stände", "Zenkutsu-, Kokutsu-, Kiba-dachi"),
  b("zonen", "Jodan, Chudan, Gedan", "Kopf, Körpermitte, unten"),
];
const BEGRIFFE_4: Punkt[] = [b("techniken", "Namen der Techniken", "Abwehr (Uke), Stoß (Zuki), Schlag (Uchi), Tritt (Geri)")];
const BEGRIFFE_3: Punkt[] = [b("dojo-kun", "Dojo-Kun", "Die fünf Regeln des Dojo")];
const BEGRIFFE_2: Punkt[] = [b("kata-namen", "Bedeutung der Kata-Namen")];
const BEGRIFFE_1: Punkt[] = [b("geschichte", "Geschichte des Shotokan", "Gichin Funakoshi, Herkunft aus Okinawa")];

const rep = (list: Punkt[]) => list.map((p) => ({ ...p, wiederholung: true }));

export const PROGRAMM: Grad[] = [
  { kyu: 5, punkte: [...KIHON_5, kata("heian-godan", "Heian Godan"), ...heian(4), KIHON_IPPON, ...BEGRIFFE_5] },
  { kyu: 4, punkte: [...KIHON_5, ...KIHON_4, kata("tekki-shodan", "Tekki Shodan"), ...heian(5), KIHON_IPPON, ...BEGRIFFE_4, ...rep(BEGRIFFE_5)] },
  { kyu: 3, punkte: [...KIHON_5, ...KIHON_4, ...KIHON_3, kata("bassai-dai", "Bassai Dai"), ...heian(5), kata("tekki-shodan", "Tekki Shodan", { wiederholung: true }), JIYU_IPPON, ...BEGRIFFE_3, ...rep([...BEGRIFFE_5, ...BEGRIFFE_4])] },
  {
    kyu: 2,
    punkte: [
      ...KIHON_5, ...KIHON_4, ...KIHON_3, ...KIHON_2,
      { ...kata("wahl-2", "Wahlkata"), de: "Kanku Dai, Enpi oder Jion" },
      kata("bassai-dai", "Bassai Dai", { wiederholung: true }), ...heian(5), kata("tekki-shodan", "Tekki Shodan", { wiederholung: true }),
      JIYU_IPPON, ...BEGRIFFE_2, ...rep([...BEGRIFFE_5, ...BEGRIFFE_4, ...BEGRIFFE_3]),
    ],
  },
  {
    kyu: 1,
    punkte: [
      ...KIHON_5, ...KIHON_4, ...KIHON_3, ...KIHON_2, ...KIHON_1,
      { ...kata("tokui", "Tokui-Kata"), de: "Lieblingskata: Bassai Dai, Kanku Dai, Enpi oder Jion" },
      { key: "kata.pruefer", gruppe: "Kata", name: "Kata nach Wahl des Prüfers", de: "Eine weitere Kata aus dem bisherigen Programm" },
      ...heian(5), kata("tekki-shodan", "Tekki Shodan", { wiederholung: true }),
      JIYU_IPPON, JIYU, ...BEGRIFFE_1, ...rep([...BEGRIFFE_5, ...BEGRIFFE_4, ...BEGRIFFE_3, ...BEGRIFFE_2]),
    ],
  },
];

export const grad = (kyu: number) => PROGRAMM.find((g) => g.kyu === kyu) ?? PROGRAMM[0];

// Stand eines Punktes: eigener Stand, sonst aus den Teilen (alle sitzen → sitzt, einer begonnen → übe ich)
export function stand(p: Punkt, m: Map<string, Status>): Status {
  const own = m.get(p.key) ?? "offen";
  if (own !== "offen" || !p.teile?.length) return own;
  const t = p.teile.map((x) => m.get(x.key) ?? "offen");
  if (t.every((s) => s === "sitzt")) return "sitzt";
  return t.some((s) => s !== "offen") ? "uebe" : "offen";
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
