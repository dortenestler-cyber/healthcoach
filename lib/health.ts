// Feste Inhalte für den Bereich Gesundheit: Krankheiten, Verletzungen, Medikamente.
// Keine Diagnosen, keine Dosierungen. Hinweise zu Medikamenten nur mit Quelle.

export type Medication = {
  id: string;
  name: string;
  kind: "medikament" | "supplement";
  regular: boolean;
  as_needed: boolean;
  times: string[];
  amount: string | null;
  notes_key: string | null;
  active: boolean;
};

export type Intake = { id: string; medication_id: string; at: string; as_needed: boolean; slot: string | null; day: string };

export type Illness = {
  id: string;
  kind: string;
  label: string;
  started_on: string;
  ended_on: string | null;
  severity: number;
  fever: boolean;
  below_neck: boolean;
};

export type Injury = { id: string; spot: string; kind: string | null; cause: string | null; started_on: string; ended_on: string | null };

// ---------- Krankheiten

export const ILLNESSES: { key: string; label: string; fever?: boolean; below?: boolean }[] = [
  { key: "erkaeltung", label: "Erkältung" },
  { key: "grippal", label: "Grippaler Infekt", below: true },
  { key: "grippe", label: "Grippe", fever: true, below: true },
  { key: "corona", label: "Corona", fever: true, below: true },
  { key: "magen", label: "Magen-Darm", below: true },
  { key: "migraene", label: "Migräne" },
  { key: "kopf", label: "Kopfschmerzen" },
  { key: "blase", label: "Blasenentzündung" },
  { key: "heu", label: "Heuschnupfen" },
  { key: "ruecken", label: "Rückenschmerzen" },
];

export function illnessRule(i: Pick<Illness, "kind" | "severity" | "fever" | "below_neck">): { stop: boolean; title: string; text: string } {
  if (i.fever || i.below_neck || i.severity >= 4) {
    const why = i.fever ? "Mit Fieber" : i.below_neck ? "Mit Beschwerden unterhalb des Halses" : "Bei so starken Beschwerden";
    return {
      stop: true,
      title: "Pause",
      text: `${why} kein Training, bis du 24 Stunden beschwerdefrei bist.${i.kind === "magen" ? " Trink genug." : ""}`,
    };
  }
  const rules: Record<string, { title: string; text: string }> = {
    migraene: { title: "nach Gefühl", text: "Kein Training im Anfall. Danach locker starten, zum Beispiel Gehen." },
    kopf: { title: "nur leicht", text: "Leichte Bewegung an der frischen Luft ist okay. Keine Intervalle." },
    heu: { title: "möglich", text: "Bei viel Pollenflug lieber drinnen trainieren. Behalte deine Bedarfs-Hübe im Blick." },
    ruecken: { title: "angepasst", text: "Bewegung hilft meist. Keine schweren Swings, dafür Gehen und Mobilität." },
    blase: { title: "nur leicht", text: "Kein hartes Training, viel trinken. Bei Fieber oder Schmerzen in der Flanke ärztlich abklären." },
  };
  return {
    stop: false,
    ...(rules[i.kind] ?? { title: "nur leicht", text: "Beschwerden nur oberhalb des Halses: Gehen ist okay. Kein Kumite, keine Intervalle." }),
  };
}

export const RETURN_STEPS = [
  { when: "Tag 1–2", what: "Gehen oder lockeres Rad fahren, 20 bis 30 Minuten" },
  { when: "Tag 3–4", what: "Technik: Kata, leichte Kettlebell, Bouldern weit unter deinem Projekt" },
  { when: "ab Tag 5", what: "Normales Training, wenn Ruhepuls und HRV wieder im Normalbereich sind" },
];

// ---------- Verletzungen

export const SPOTS: Record<string, { label: string; x: number; y: number; sports: string[]; rows: [string, string][]; kyu: string }> = {
  finger: {
    label: "Finger", x: 145, y: 133, sports: ["klettern"],
    rows: [["Klettern und Bouldern", "Pause, bis der Finger schmerzfrei belastbar ist"], ["Swing und Clean & Press", "Goblet Squat mit lockerem Griff oder Beine ohne Gewicht"], ["Karate: Fauststöße mit Kontakt", "Techniken in die Luft, Kata"]],
    kyu: "Für den 5. Kyu üben: Stände, Tritte und die Kata-Abfolge. Fauststöße nur in die Luft.",
  },
  hand: {
    label: "Handgelenk", x: 29, y: 121, sports: ["klettern"],
    rows: [["Liegestütz", "Unterarmstütz"], ["Clean & Press", "Goblet Squat"], ["Klettern und Bouldern", "Pause"]],
    kyu: "Für den 5. Kyu üben: Stände, Tritte und die Kata-Abfolge. Fauststöße nur locker in die Luft.",
  },
  schulter: {
    label: "Schulter", x: 117, y: 40, sports: ["klettern"],
    rows: [["Clean & Press und Halo", "Beinübungen wie Goblet Squat"], ["Klettern und Bouldern", "Pause"], ["Karate: Schläge mit voller Kraft", "Tritte und Stände"]],
    kyu: "Für den 5. Kyu üben: Tritte, Stände und die Kata-Abfolge mit lockeren Armen.",
  },
  ruecken: {
    label: "Rücken", x: 85, y: 78, sports: [],
    rows: [["Swing und schwere Kettlebell", "Gehen, Mobilität, leichte Kettlebell"], ["Kumite", "Kata langsam und im hohen Stand"]],
    kyu: "Für den 5. Kyu üben: die Kata langsam und ohne tiefe Stände.",
  },
  knie: {
    label: "Knie", x: 69, y: 175, sports: [],
    rows: [["Ausfallschritt und Goblet Squat", "Oberkörper-Übungen"], ["Karate: Tritte und tiefe Stände", "Arm-Techniken im hohen Stand"], ["Joggen", "Rad fahren nach Gefühl"]],
    kyu: "Für den 5. Kyu üben: Arm-Techniken aus dem Kihon und die Kata-Abfolge im hohen Stand.",
  },
  wade: {
    label: "Wade / Achillessehne", x: 102, y: 189, sports: ["klettern"],
    rows: [["Joggen, Springen und Sprints", "Rad fahren oder Rudern nach Gefühl"], ["Bouldern", "Pause, vor allem kein Abspringen"], ["Karate: Tritte und Sprünge", "Arm-Techniken im hohen Stand"], ["Ausfallschritt und tiefe Kniebeuge", "Oberkörper-Übungen, Swing nur wenn schmerzfrei"]],
    kyu: "Für den 5. Kyu üben: Arm-Techniken aus dem Kihon und die Kata-Abfolge im hohen Stand, ohne Sprünge.",
  },
  fuss: {
    label: "Fuß", x: 103, y: 221, sports: ["klettern"],
    rows: [["Joggen und Springen", "Rad fahren nach Gefühl"], ["Bouldern", "Pause, vor allem kein Abspringen"], ["Karate-Tritte", "Arm-Techniken im Stand"]],
    kyu: "Für den 5. Kyu üben: Arm-Techniken und die Kata-Abfolge im Kopf.",
  },
};

export const INJURY_KINDS = ["Prellung", "Zerrung", "Verstauchung", "Haut"];
export const INJURY_CAUSES = ["Karate", "Klettern", "Kettlebell", "Alltag"];

// ---------- Medikamente und Supplements

export const MED_PRESETS: Omit<Medication, "id" | "active">[] = [
  { name: "Bufori Easyhaler", kind: "medikament", regular: true, as_needed: true, times: ["07:30", "21:30"], amount: null, notes_key: "bufori" },
  { name: "Omega-3", kind: "supplement", regular: true, as_needed: false, times: ["08:00"], amount: null, notes_key: "omega3" },
  { name: "Magnesium", kind: "supplement", regular: true, as_needed: false, times: ["08:00"], amount: null, notes_key: "magnesium" },
  { name: "Vitamin D", kind: "supplement", regular: true, as_needed: false, times: ["08:00"], amount: null, notes_key: "vitd" },
];

export const MED_NOTES: Record<string, { tips: string[]; source: string }> = {
  bufori: {
    tips: [
      "Nach jedem Hub den Mund ausspülen. Das beugt Pilzinfektionen im Mund vor.",
      "Formoterol kann Herzklopfen, Zittern oder einen etwas höheren Puls auslösen. Ein höherer Puls kurz nach einem Hub ist kein Zeichen schlechter Form.",
      "Vor Kumite und Intervallen länger aufwärmen.",
      "Joggen im Winter: Kalte, trockene Luft ist ein typischer Auslöser. Ein Tuch vor dem Mund hilft.",
      "Bouldern: Chalk-Staub kann in vollen Hallen reizen.",
      "Brauchst du öfter Bedarfs-Hübe als sonst, bitte ärztlich abklären. Atemnot, die trotz Inhalator nicht besser wird, ist ein Notfall: 112.",
    ],
    source: "Quelle: Fachinformation und Gebrauchsinformation Bufori Easyhaler",
  },
  omega3: {
    tips: ["Zu einer Mahlzeit nehmen, das hilft gegen Aufstoßen.", "Bei hohen Mengen können blaue Flecken nach Stürzen etwas leichter entstehen. Nur ein Hinweis, kein Grund zum Absetzen."],
    source: "Allgemeine Hinweise · keine Dosierungsempfehlung",
  },
  magnesium: {
    tips: ["Viele nehmen es abends, weil sie dann besser entspannen.", "Größere Mengen können zu weichem Stuhl führen.", "Abstand zu bestimmten Antibiotika halten, weil Magnesium deren Aufnahme stören kann."],
    source: "Allgemeine Hinweise · keine Dosierungsempfehlung",
  },
  vitd: {
    tips: ["Zu einer Mahlzeit mit etwas Fett nehmen.", "Im Winter besonders wichtig, weil die Sonne kaum reicht.", "Wichtig für Knochen und Muskeln. Das passt zur Perimenopause.", "Laborwerte nimmt die App nicht auf. Ob dein Wert passt, kann deine Ärztin bei Bedarf prüfen."],
    source: "Allgemeine Hinweise · keine Dosierungsempfehlung",
  },
};

const NSAR = /ibuprofen|diclofenac|naproxen|aspirin|\bass\b|acetylsalicyl/i;
const ANTIBIOTIC = /doxycyclin|tetracyclin|minocyclin|ciprofloxacin|levofloxacin|moxifloxacin|ofloxacin/i;

// Einfache Prüfung bekannter Wechselwirkungen nach Namen. Ersetzt keine Beratung in der Apotheke.
export function interactionNotes(meds: Medication[]): { warn: boolean; text: string }[] {
  const active = meds.filter((m) => m.active);
  const has = (re: RegExp) => active.some((m) => re.test(m.name));
  const hasKey = (k: string) => active.some((m) => m.notes_key === k);
  const out: { warn: boolean; text: string }[] = [];
  if (hasKey("bufori") && has(NSAR)) {
    out.push({ warn: true, text: "Schmerzmittel wie Ibuprofen oder ASS können bei manchen Menschen mit Asthma Beschwerden auslösen. Bitte vor der Einnahme mit Apotheke oder Arztpraxis klären." });
  }
  if (hasKey("magnesium") && has(ANTIBIOTIC)) {
    out.push({ warn: true, text: "Magnesium kann die Aufnahme dieses Antibiotikums stören. Frag in der Apotheke, wie viel Abstand nötig ist." });
  }
  const unknown = active.filter((m) => !m.notes_key || !MED_NOTES[m.notes_key]);
  if (unknown.length) {
    out.push({ warn: false, text: `Für ${unknown.map((m) => m.name).join(", ")} hat die App keine geprüften Hinweise. Frag zu Wechselwirkungen bitte in der Apotheke.` });
  }
  if (!out.length) {
    out.push({ warn: false, text: "Zwischen deinen aktiven Mitteln ist keine relevante Wechselwirkung bekannt. Im Zweifel frag in der Apotheke." });
  }
  return out;
}

// Uhrzeit aus Text wie "7:30" oder "07.30" machen
export function normTime(t: string): string | null {
  const m = t.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ---------- Wochen und üblicher Bereich für Bedarfs-Einnahmen

export function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const wd = (x.getDay() + 6) % 7; // Montag = 0
  x.setDate(x.getDate() - wd);
  return x;
}

// Zählt Bedarfs-Einnahmen pro Woche, älteste zuerst; die letzte Zahl ist die laufende Woche
export function weeklyCounts(intakes: { at: string }[], weeks: number): number[] {
  const now = weekStart(new Date()).getTime();
  const counts = Array.from({ length: weeks }, () => 0);
  for (const i of intakes) {
    const w = Math.round((now - weekStart(new Date(i.at)).getTime()) / (7 * 864e5));
    if (w >= 0 && w < weeks) counts[weeks - 1 - w] += 1;
  }
  return counts;
}

// Üblicher Bereich aus den Vorwochen; mit wenig Daten gilt 2 bis 4 pro Woche
export function usualRange(previous: number[]): { lo: number; hi: number; own: boolean } {
  const withData = previous.filter((c) => c > 0);
  if (withData.length < 4) return { lo: 2, hi: 4, own: false };
  return { lo: Math.min(...previous), hi: Math.max(2, ...previous), own: true };
}
