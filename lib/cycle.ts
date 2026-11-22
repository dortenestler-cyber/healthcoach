// Zykluslogik: Phase, nächste Periode als Fenster, Regelreihenfolge und Readiness.
// Reine Berechnungen ohne Netzwerk. Alle Phasen sind geschätzt und werden so benannt.
// Die Werte sind Startwerte zum Kalibrieren, nicht medizinisch geprüft. Die App schlägt vor, sie entscheidet nicht.

import { computeTarget, cycleInfo, periodStarts, type Data, type Diary, type Target } from "@/lib/insights";

// ---------- Hilfen

const DAY_MS = 864e5;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DAY_MS);
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v: number[]) => {
  const m = mean(v);
  return m === null || v.length < 2 ? null : Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

// ---------- Phasen

export type Phase = "menstruation" | "follikel" | "eisprung" | "luteal-frueh" | "luteal-spaet";

export const PHASES: Record<Phase, { label: string; inPhase: string; pattern: string; suggestion: string; rpe: string; hint: string }> = {
  menstruation: {
    label: "Menstruation",
    inPhase: "deiner Menstruation",
    pattern: "Müdigkeit und Krämpfe sind möglich, die Körperwerte liegen meist im Normalbereich.",
    suggestion: "Mobility, Spaziergang, lockere Ausdauer, Kraft nach Gefühl",
    rpe: "5–7",
    hint: "Ungewohnt starke oder lange Blutung bitte ärztlich abklären lassen.",
  },
  follikel: {
    label: "Follikelphase",
    inPhase: "deiner Follikelphase",
    pattern: "Oft gute Erholung, die HRV ist eher höher.",
    suggestion: "Aufbau, Kraft mit mehr Volumen, Intervalle",
    rpe: "8–9",
    hint: "10 Minuten Aufwärmen für Sehnen und Gelenke.",
  },
  eisprung: {
    label: "Eisprung-Fenster",
    inPhase: "deinem Eisprung-Fenster",
    pattern: "Hohe Leistung ist möglich, Sehnen und Gelenke sind etwas lockerer.",
    suggestion: "Schwere Sätze oder Bestleistung nur bei guter Readiness",
    rpe: "bis 9,5",
    hint: "Gründlich aufwärmen, Technik vor Gewicht, Sprünge dosieren.",
  },
  "luteal-frueh": {
    label: "Frühe Lutealphase",
    inPhase: "deiner frühen Lutealphase",
    pattern: "Temperatur und Ruhepuls leicht höher, die HRV sinkt etwas.",
    suggestion: "Kraft, ruhige Ausdauer",
    rpe: "8–8,5",
    hint: "Etwas niedrigere HRV ist in dieser Phase normal.",
  },
  "luteal-spaet": {
    label: "Späte Lutealphase",
    inPhase: "deiner späten Lutealphase",
    pattern: "Schlaf oft unruhiger, HRV niedriger, Nachtschweiß häufiger.",
    suggestion: "Kraft moderater, Technik, Mobility",
    rpe: "7–7,5",
    hint: "Mehr Erholung einplanen.",
  },
};

// Grenzen passen sich der eigenen Zykluslänge an:
// Tag 1–5 Menstruation, Eisprung etwa 14 Tage vor der nächsten Periode (3-Tage-Fenster),
// letzte 7 Tage späte Lutealphase. Länger als üblich: weiter späte Lutealphase.
export function phaseFor(cycleDay: number, length: number): Phase {
  const ov = length - 14;
  if (cycleDay <= 5) return "menstruation";
  if (cycleDay > length - 7) return "luteal-spaet";
  if (cycleDay < ov - 1) return "follikel";
  if (cycleDay <= ov + 1) return "eisprung";
  return "luteal-frueh";
}

// Beobachtete Zykluslängen (nur plausible Werte 15–60 Tage), die letzten 6
export function cycleLengths(diary: Diary[], until?: string): number[] {
  const starts = periodStarts(diary).filter((s) => !until || s <= until);
  const lens: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const l = daysBetween(starts[i - 1], starts[i]);
    if (l >= 15 && l <= 60) lens.push(l);
  }
  return lens.slice(-6);
}

export type PeriodWindow = { earliest: string; latest: string; basis: number };

// Nächste Periode immer als Fenster, nie als einzelnes Datum. Ab zwei beobachteten Zyklen.
export function nextPeriodWindow(diary: Diary[], day: string): PeriodWindow | null {
  const starts = periodStarts(diary).filter((s) => s <= day);
  const last = starts[starts.length - 1];
  const lens = cycleLengths(diary, day);
  if (!last || lens.length < 2) return null;
  return { earliest: addDays(last, Math.min(...lens)), latest: addDays(last, Math.max(...lens)), basis: lens.length };
}

// Nächste Periode als Spanne in Tagen ab heute, z. B. „in etwa 10–12 Tagen“
export function windowText(w: PeriodWindow, day: string): string {
  const a = daysBetween(day, w.earliest);
  const b = daysBetween(day, w.latest);
  if (b < 0) return "Nächste Periode ist überfällig (Fenster vorbei)";
  if (a <= 0) return b === 0 ? "Nächste Periode ist ab heute fällig" : `Nächste Periode ist fällig, Fenster noch ${b} ${b === 1 ? "Tag" : "Tage"}`;
  return a === b ? `Nächste Periode in etwa ${a} ${a === 1 ? "Tag" : "Tagen"}` : `Nächste Periode in etwa ${a}–${b} Tagen`;
}

export type CycleToday = { cycleDay: number | null; length: number; phase: Phase | null; window: PeriodWindow | null; cycles: number };

export function cycleToday(day: string, diary: Diary[]): CycleToday {
  const ci = cycleInfo(day, diary);
  return {
    cycleDay: ci.cycleDay,
    length: ci.length,
    phase: ci.cycleDay !== null ? phaseFor(ci.cycleDay, ci.length) : null,
    window: nextPeriodWindow(diary, day),
    cycles: ci.cycles,
  };
}

// ---------- Readiness 0–10 (aus dem Tagesziel-Wert 0–100)

export type Stage = "erholen" | "behutsam" | "bereit" | "volle-kraft";
export const STAGES: Record<Stage, string> = { erholen: "Erholen", behutsam: "Behutsam", bereit: "Bereit", "volle-kraft": "Volle Kraft" };

// Schwellen sind eine Annahme und werden mit echten Daten geprüft
export function readinessFrom(t: Target): { value: number; stage: Stage; label: string } {
  const value = t.pause ? 0 : Math.round(t.score) / 10;
  const stage: Stage = value < 3 ? "erholen" : value < 6 ? "behutsam" : value < 8.5 ? "bereit" : "volle-kraft";
  return { value, stage, label: STAGES[stage] };
}

// ---------- Regelreihenfolge

export type RuleLevel = "warnzeichen" | "infekt" | "reha" | "drosseln" | "phase";

export type DayRule = {
  level: RuleLevel; // die oberste Regel, die heute greift
  title: string;
  text: string;
  redFlag: string | null; // nur ärztlicher Hinweis, sonst nichts
  infection: boolean; // Schongang vorschlagen, die Nutzerin entscheidet
  rehaSports: string[]; // Sportarten mit Ersatzübungen
  throttle: boolean; // Belastung senken: nur wenn Symptome und niedrige HRV zusammenkommen
  corridorFactor: number; // 1 = normal, 0,78 = etwa 22 % weniger
  cycle: CycleToday;
  readiness: { value: number; stage: Stage; label: string };
  target: Target;
};

// 1. Warnzeichen aus dem Tagebuch
function redFlagFor(day: string, diary: Diary[]): string | null {
  const byDay = new Map(diary.map((d) => [d.day, d]));
  // starke Blutung (Stufe 4) an 3 Tagen in Folge
  let strongRun = 0;
  for (let i = 0; i < 3; i++) if ((byDay.get(addDays(day, -i))?.bleeding ?? 0) >= 4) strongRun++;
  if (strongRun >= 3) return "Seit drei Tagen starke Blutung. Bitte ärztlich abklären lassen.";
  // Blutung länger als 8 Tage am Stück
  let run = 0;
  while (run < 30 && (byDay.get(addDays(day, -run))?.bleeding ?? 0) >= 1) run++;
  if (run > 8) return `Blutung seit ${run} Tagen. Bitte ärztlich abklären lassen.`;
  return null;
}

// 2. Infekt-Verdacht: Ruhepuls mindestens 6 bpm über dem Schnitt und HRV darunter
function infectionFor(day: string, data: Data): boolean {
  const today = data.daily.find((r) => r.day === day);
  if (!today || today.hrv_last_night === null) return false;
  if (today.resting_hr === null && typeof today.skin_temp_delta !== "number") return false;
  const hist = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -30));
  const rhr = mean(hist.map((r) => r.resting_hr).filter((v): v is number => v !== null));
  const hrv = mean(hist.map((r) => r.hrv_last_night).filter((v): v is number => v !== null));
  if (rhr === null || hrv === null || hist.length < 7) return false;
  const temp = typeof today.skin_temp_delta === "number" ? Number(today.skin_temp_delta) : null;
  // Ruhepuls deutlich höher oder Hauttemperatur mindestens 0,5 °C über dem Normalwert, jeweils zusammen mit niedriger HRV
  return ((today.resting_hr !== null && today.resting_hr >= rhr + 6) || (temp !== null && temp >= 0.5)) && today.hrv_last_night < hrv;
}

// 4. Symptome plus niedrige HRV (beides muss zusammenkommen)
function throttleFor(day: string, data: Data): boolean {
  const di = data.diary.find((d) => d.day === day) ?? data.diary.find((d) => d.day === addDays(day, -1));
  const s = di?.symptoms ?? {};
  const symptoms = (s.nacht ?? 0) >= 2 || (s.schlaf ?? 0) >= 2 || Object.values(s).some((v) => v >= 3);
  if (!symptoms) return false;
  const today = data.daily.find((r) => r.day === day);
  const hist = data.daily
    .filter((r) => r.day < day && r.day >= addDays(day, -30))
    .map((r) => r.hrv_last_night)
    .filter((v): v is number => v !== null);
  const m = mean(hist);
  const d = sd(hist);
  if (!today || today.hrv_last_night === null || m === null || d === null || hist.length < 7) return false;
  return today.hrv_last_night < m - 0.75 * d;
}

export function dayRule(day: string, data: Data, injuredSports: string[] = []): DayRule {
  const target = computeTarget(day, data);
  const cycle = cycleToday(day, data.diary);
  const readiness = readinessFrom(target);
  const redFlag = redFlagFor(day, data.diary);
  const infection = !redFlag && infectionFor(day, data);
  const rehaSports = [...new Set(injuredSports)];
  const throttle = throttleFor(day, data);
  const corridorFactor = throttle ? 0.78 : 1;
  const base = { redFlag, infection, rehaSports, throttle, corridorFactor, cycle, readiness, target };

  if (redFlag) return { ...base, level: "warnzeichen", title: "Bitte ärztlich abklären", text: redFlag, infection: false, throttle: false, corridorFactor: 1 };
  if (target.pause)
    return {
      ...base,
      level: "infekt",
      title: "Pause empfohlen",
      text: "Du hast eine Krankheit eingetragen. Vorschlag: heute Erholung statt Training. Du entscheidest.",
    };
  if (infection)
    return {
      ...base,
      level: "infekt",
      title: "Schongang empfohlen",
      text: "Ruhepuls oder Hauttemperatur sind deutlich höher und deine HRV niedriger als sonst. Das kann auf einen Infekt hindeuten. Vorschlag: heute Pause oder nur ruhig gehen. Du entscheidest.",
    };
  if (rehaSports.length)
    return {
      ...base,
      level: "reha",
      title: "Reha berücksichtigt",
      text: `Für ${rehaSports.join(", ")} schlägt die App Ersatzübungen vor.${throttle ? " Dazu etwas weniger Belastung, weil Symptome und niedrige HRV zusammenkommen." : ""}`,
    };
  if (throttle)
    return {
      ...base,
      level: "drosseln",
      title: "Heute etwas weniger",
      text: "Symptome und eine niedrige HRV kommen zusammen. Vorschlag: etwa ein Fünftel weniger Belastung, Fokus auf Technik und Mobility.",
    };
  const p = cycle.phase ? PHASES[cycle.phase] : null;
  return {
    ...base,
    level: "phase",
    title: p ? `${p.label} (geschätzt)` : "Zyklusphase noch unbekannt",
    text: p ? `Vorschlag: ${p.suggestion}. ${p.hint}` : "Trag deine Periode im Tagebuch ein, dann kann die App die Phase schätzen.",
  };
}

// ---------- Diagramm-Hilfen

// Phase für jeden Tag (Vergangenheit aus dem Tagebuch, Zukunft fortgeschrieben)
export function phaseBand(days: string[], diary: Diary[]): (Phase | null)[] {
  return days.map((d) => cycleToday(d, diary).phase);
}

// Ein Satz zur HRV heute im Vergleich zu derselben Phase (oder den letzten 30 Tagen)
export function hrvInsight(day: string, data: Data): string {
  const today = data.daily.find((r) => r.day === day)?.hrv_last_night ?? null;
  if (today === null) return "Für heute gibt es noch keinen HRV-Wert.";
  const phase = cycleToday(day, data.diary).phase;
  let ref: number[] = [];
  let where = "der letzten 30 Tage";
  if (phase) {
    const same = data.daily.filter((r) => r.day < day && r.hrv_last_night !== null && cycleToday(r.day, data.diary).phase === phase).map((r) => r.hrv_last_night as number);
    if (same.length >= 5) {
      ref = same;
      where = PHASES[phase].inPhase;
    }
  }
  if (!ref.length) ref = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -30) && r.hrv_last_night !== null).map((r) => r.hrv_last_night as number);
  const m = mean(ref);
  const d = sd(ref);
  if (m === null || d === null || ref.length < 5) return `Deine HRV heute: ${Math.round(today)} ms. Für einen Vergleich fehlen noch ein paar Tage.`;
  const z = d > 0 ? (today - m) / d : 0;
  if (Math.abs(z) < 0.75) return `Deine HRV liegt im üblichen Bereich ${where}.`;
  return `Deine HRV liegt ${z > 0 ? "über" : "unter"} dem Üblichen ${where}.`;
}

// ---------- Vergleich zwischen Phasen (Verlauf und Muster-Karte)

export type PhaseGroup = "menstruation" | "follikel" | "luteal";
export const PHASE_GROUPS: [PhaseGroup, string][] = [
  ["menstruation", "Menstruation"],
  ["follikel", "Follikel"],
  ["luteal", "Luteal"],
];
export const groupOf = (p: Phase | null): PhaseGroup | null =>
  p === "menstruation" ? "menstruation" : p === "follikel" || p === "eisprung" ? "follikel" : p ? "luteal" : null;

// Schnitt eines Werts je Phasengruppe, nur Tage mit Wert
export function phaseMeans(values: { day: string; value: number | null }[], diary: Diary[]): Record<PhaseGroup, { mean: number | null; n: number }> {
  const acc: Record<PhaseGroup, number[]> = { menstruation: [], follikel: [], luteal: [] };
  for (const v of values) {
    if (v.value === null) continue;
    const g = groupOf(cycleToday(v.day, diary).phase);
    if (g) acc[g].push(v.value);
  }
  const out = {} as Record<PhaseGroup, { mean: number | null; n: number }>;
  for (const g of Object.keys(acc) as PhaseGroup[]) out[g] = { mean: mean(acc[g]), n: acc[g].length };
  return out;
}

// Ein Satz: Lutealphase im Vergleich zur Follikelphase, vorsichtig formuliert
export function phaseInsight(label: string, values: { day: string; value: number | null }[], diary: Diary[], fmtDiff: (v: number) => string): string | null {
  const pm = phaseMeans(values, diary);
  const l = pm.luteal;
  const f = pm.follikel;
  if (l.mean === null || f.mean === null || l.n < 5 || f.n < 5) return null;
  const all = values.map((v) => v.value).filter((v): v is number => v !== null);
  const spread = sd(all) ?? 0;
  const diff = l.mean - f.mean;
  if (Math.abs(diff) < 0.25 * spread || diff === 0) return `${label}: in Follikel- und Lutealphase etwa gleich.`;
  return `${label} liegt in der Lutealphase im Schnitt ${fmtDiff(Math.abs(diff))} ${diff > 0 ? "höher" : "niedriger"} als in der Follikelphase.`;
}
