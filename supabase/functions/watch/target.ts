// Health Coach · Tagesziel ("Belastung heute"), Zyklustag und Phase für die Uhr.
// Gleiche Rechnung wie in der App (lib/insights.ts computeTarget, lib/cycle.ts phaseFor),
// hier für die Edge Function nachgebaut, weil sie die App-Dateien nicht laden kann.
// Wer die Rechnung in der App ändert, ändert sie hier mit.

// deno-lint-ignore no-explicit-any
type Any = any;

export type Day = { day: string; hrv_last_night: number | null; resting_hr: number | null; bb_max: number | null };
export type DiaryRow = { day: string; bleeding: number; symptoms: Record<string, number> | null };
export type Checkin = { energy: number | null; sleep: number | null; mood: number | null } | null;
export type Illness = { kind?: string; severity: number; fever: boolean; below_neck: boolean } | null;

const DAY_MS = 864e5;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const between = (a: string, b: string) => Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / DAY_MS);
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// Periodenbeginne aus dem Tagebuch, ergänzt um Garmin-Zyklen ohne eigenen Eintrag in der Nähe (±3 Tage)
export function periodStarts(diary: DiaryRow[], garmin: string[]): string[] {
  const bleed = new Set(diary.filter((d) => d.bleeding >= 2).map((d) => d.day));
  const any = new Set(diary.filter((d) => d.bleeding >= 1).map((d) => d.day));
  const starts = [...bleed].filter((d) => !any.has(addDays(d, -1)) && !any.has(addDays(d, -2)));
  const bleedDays = [...any];
  for (const g of garmin) if (!bleedDays.some((d) => Math.abs(between(d, g)) <= 3)) starts.push(g);
  return [...new Set(starts)].sort();
}

export function cycleInfo(day: string, starts: string[]) {
  const s = starts.filter((x) => x <= day);
  const lens: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const l = between(s[i - 1], s[i]);
    if (l >= 15 && l <= 60) lens.push(l);
  }
  const length = Math.round(mean(lens) ?? 28);
  const last = s[s.length - 1];
  if (!last) return { cycleDay: null as number | null, length, beforePeriod: false };
  const cycleDay = between(last, day) + 1;
  return { cycleDay, length, beforePeriod: cycleDay > length - 5 && cycleDay <= length + 3 };
}

// Kurzname der geschätzten Phase für das Zifferblatt (wie phaseFor in lib/cycle.ts)
export function phaseShort(cycleDay: number | null, length: number): string | null {
  if (cycleDay === null) return null;
  const ov = length - 14;
  if (cycleDay <= 5) return "MENS";
  if (cycleDay > length - 7) return "LUT2";
  if (cycleDay < ov - 1) return "FOLL";
  if (cycleDay <= ov + 1) return "EISP";
  return "LUT1";
}

function cycleBeforeDiff(daily: Map<string, Day>, starts: string[]): { ready: boolean; beforeDiff: number | null } {
  const phases = [
    { from: 1, to: 5 },
    { from: 6, to: 13 },
    { from: 14, to: 20 },
    { from: -5, to: -1 },
  ];
  const hrv: number[][] = phases.map(() => []);
  let cycles = 0;
  for (let i = 0; i < starts.length - 1; i++) {
    const len = between(starts[i], starts[i + 1]);
    if (len < 15 || len > 60) continue;
    cycles++;
    for (let d = 1; d <= len; d++) {
      const r = daily.get(addDays(starts[i], d - 1));
      if (!r) continue;
      const fromEnd = d - len - 1;
      phases.forEach((p, idx) => {
        const hit = p.from > 0 ? d >= p.from && d <= p.to && fromEnd < -5 : fromEnd >= p.from && fromEnd <= p.to;
        if (hit && r.hrv_last_night !== null) hrv[idx].push(r.hrv_last_night);
      });
    }
  }
  const before = mean(hrv[3]);
  const rest = mean([...hrv[0], ...hrv[1], ...hrv[2]]);
  const ready = cycles >= 2 && hrv.every((h) => h.length >= 3);
  return { ready, beforeDiff: before !== null && rest ? ((before - rest) / rest) * 100 : null };
}

// Persönlicher Bereich wie lib/baseline.ts (Stand PR #60):
// - 30-Tage-Bereich: Tage day-30 bis day-1, mittlere Hälfte, vorläufig ab 7, stabil ab 14 Tagen
// - je Zyklusphase (Menstruation, Follikel, Eisprung, Luteal) ein eigener Bereich aus den letzten 150 Tagen,
//   ab 10 Tagen derselben Phase; gilt für HRV, Ruhepuls und die Schlafwerte (schlaf.ts)
// - Krankheitstage und die 3 Tage danach zählen nicht
// Für die Readiness zählt nur ein stabiler Bereich (ab 14 Tagen), sonst wirkt der Wert nicht.
export type Range = { lo: number; hi: number; median: number; stable: boolean };
const RANGE_DAYS = 30;
const MIN_DAYS = 14;
const MIN_PROVISIONAL = 7;
const PHASE_LOOKBACK = 150;
const MIN_PHASE_DAYS = 10;
const SICK_AFTER = 3;
export type RangePhase = "menstruation" | "follikel" | "eisprung" | "luteal";

const quantile = (v: number[], q: number) => {
  const pos = (v.length - 1) * q;
  const i = Math.floor(pos);
  return i + 1 < v.length ? v[i] + (pos - i) * (v[i + 1] - v[i]) : v[i];
};
function middleHalf(values: number[], minDays: number): Range | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length < minDays ? null : { lo: quantile(v, 0.25), hi: quantile(v, 0.75), median: quantile(v, 0.5), stable: v.length >= MIN_DAYS };
}

// Krankheitstage wie sickDays in lib/baseline.ts: Beginn bis Ende (offen: bis heute), dazu 3 Tage danach
export type IllnessSpan = { started_on: string; ended_on: string | null };
export function sickDays(ill: IllnessSpan[], today: string): Set<string> {
  const out = new Set<string>();
  for (const i of ill) {
    if (!i?.started_on) continue;
    const end = addDays(i.ended_on ?? today, SICK_AFTER);
    for (let d = i.started_on; d <= end && d <= today; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

// Phase eines Tags wie rangePhaseOf: frühe und späte Lutealphase zusammen; Periode lange her (Perimenopause): keine Phase
function rangePhaseOf(day: string, starts: string[]): RangePhase | null {
  const c = cycleInfo(day, starts);
  if (c.cycleDay === null || c.cycleDay > c.length + 10) return null;
  const p = phaseShort(c.cycleDay, c.length);
  return p === "MENS" ? "menstruation" : p === "FOLL" ? "follikel" : p === "EISP" ? "eisprung" : "luteal";
}

export function rangeFor<T extends { day: string }>(daily: T[], day: string, f: (r: T) => number | null, starts: string[], sick: Set<string>, phases: Map<string, RangePhase | null>): Range | null {
  const phaseOf = (d: string) => {
    if (!phases.has(d)) phases.set(d, rangePhaseOf(d, starts));
    return phases.get(d) ?? null;
  };
  const vals = (from: string, keep: (d: string) => boolean) =>
    daily.filter((r) => r.day >= from && r.day < day && !sick.has(r.day) && keep(r.day)).map(f).filter((v): v is number => v !== null);
  const ph = starts.length ? phaseOf(day) : null;
  if (ph) {
    const v = vals(addDays(day, -PHASE_LOOKBACK), (d) => phaseOf(d) === ph);
    const r = v.length >= MIN_PHASE_DAYS ? middleHalf(v, MIN_PHASE_DAYS) : null;
    if (r) return r;
  }
  return middleHalf(vals(addDays(day, -RANGE_DAYS), () => true), MIN_PROVISIONAL);
}
// Abstand außerhalb des Bereichs in Bereichsbreiten: ab 0,6 voller Abzug, darunter halber, deutlich besser kleiner Bonus
function rangeEffect(v: number | null, range: Range | null, higherIsBetter: boolean, weight: number): number {
  if (v === null || !range || !range.stable) return 0;
  const width = range.hi - range.lo || Math.max(1, Math.abs(range.median) * 0.05);
  const below = v < range.lo ? (range.lo - v) / width : 0;
  const above = v > range.hi ? (v - range.hi) / width : 0;
  const bad = higherIsBetter ? below - above : above - below;
  if (bad > 0.6) return -weight;
  if (bad > 0) return -Math.round(weight / 2);
  if (bad < -0.5) return Math.round(weight / 4);
  return 0;
}

// ---------- Belastung wie dayLoad und usualLoad in der App (lib/insights.ts, lib/alltagslast.ts)
// Skala flacht nach oben ab: 150 Last = 100 %, darüber langsam weiter (Konzept docs/konzept-belastung-skala.md)
export const FULL_DAY_LOAD = 150;
const LOAD_CURVE = 100;
export function loadToPct(load: number): number {
  return load > 0 ? (100 * Math.log(1 + load / LOAD_CURVE)) / Math.log(1 + FULL_DAY_LOAD / LOAD_CURVE) : 0;
}
const okLoad = (ld: Any) => ld && typeof ld === "object" && [1, 2, 3].includes(ld.v) && Array.isArray(ld.training) && Array.isArray(ld.alltag);
// Last eines Tages (Training + Alltag, Garmin-Einheit). Ohne Alltagsdaten: 60 Intensitätsminuten wie 150 Last.
export function dayLoadRaw(day: string, g: Any, acts: Any[]): number {
  const tl = acts.filter((a) => String(a.start_local ?? "").slice(0, 10) === day).reduce((s, a) => s + (Number(a.training_load) || 0), 0);
  const ld = g?.load_daily_min;
  if (!okLoad(ld)) return Math.max(((g?.intensity_minutes ?? 0) / 60) * FULL_DAY_LOAD, tl);
  return (tl || ld.last_training || 0) + Math.max(0, ld.last_alltag ?? 0);
}
export const dayLoadPct = (day: string, g: Any, acts: Any[]) => Math.round(loadToPct(dayLoadRaw(day, g, acts)));

// Übliche Belastung (Schnitt der letzten 28 Tage ohne kranke Tage, ab 14 Tagen) und Bremse (7 Tage über 130 % der 4 Wochen)
export function usualLoad(day: string, rows: Any[], acts: Any[], sick: Set<string>): { usual: number | null; brake: boolean } {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const pcts: number[] = [];
  const raw: number[] = [];
  for (let i = 1; i <= 28; i++) {
    const d = addDays(day, -i);
    const g = byDay.get(d);
    const l = g ? dayLoadRaw(d, g, acts) : 0;
    raw.push(l);
    if (g && !sick.has(d)) pcts.push(Math.round(loadToPct(l)));
  }
  if (pcts.length < 14) return { usual: null, brake: false };
  const acute = raw.slice(0, 7).reduce((a, b) => a + b, 0);
  const chronic = raw.reduce((a, b) => a + b, 0) / 4;
  return { usual: mean(pcts), brake: chronic > 0 && acute / chronic > 1.3 };
}
// Schlafwert (schlaf.ts) auf die Readiness wie computeTarget in der App
const sleepEffect = (s: number | null) => (s === null ? 0 : s >= 85 ? 3 : s >= 70 ? 0 : s >= 55 ? -5 : -10);
const readinessFactor = (score: number) => (score >= 85 ? 1.15 : score >= 65 ? 1 : score >= 45 ? 0.75 : 0.5);
function targetBand(score: number, usual: number, brake: boolean): { lo: number; hi: number } {
  let mid = usual * readinessFactor(score);
  if (brake) mid = Math.min(mid, usual);
  const lo = Math.max(10, Math.round(mid - 10));
  const hi = Math.min(140, Math.max(lo + 20, Math.round(mid + 10)));
  return { lo: Math.min(lo, hi - 20), hi };
}

// Tagesziel 0–100 wie computeTarget in der App, dazu Bereich und Faktoren (kurz für den Glance)
export type WatchFactor = { k: string; e: number };
const BANDS = [
  { min: 85, lo: 65, hi: 85 },
  { min: 65, lo: 45, hi: 65 },
  { min: 45, lo: 25, hi: 45 },
  { min: -999, lo: 10, hi: 25 },
];
export function targetScore(day: string, daily: Day[], diary: DiaryRow[], checkin: Checkin, illness: Illness, starts: string[], sick: Set<string> = new Set(), usual: { usual: number | null; brake: boolean } = { usual: null, brake: false }, sleep: number | null = null): { score: number; pause: boolean; lo: number; hi: number; factors: WatchFactor[] } {
  const today = daily.find((r) => r.day === day) ?? null;
  const phases = new Map<string, RangePhase | null>();
  const factors: WatchFactor[] = [];
  const add = (k: string, e: number) => factors.push({ k, e });
  // Schlaf: eigener Schlafwert (schlaf.ts) mit festen Stufen wie in der App; HRV und Ruhepuls zyklusabhängig
  add("SCHLAF", sleepEffect(sleep));
  add("HRV", rangeEffect(today?.hrv_last_night ?? null, rangeFor(daily, day, (r) => r.hrv_last_night, starts, sick, phases), true, 12));
  add("PULS", rangeEffect(today?.resting_hr ?? null, rangeFor(daily, day, (r) => r.resting_hr, starts, sick, phases), false, 8));
  if (today?.bb_max !== null && today?.bb_max !== undefined) {
    const bb = today.bb_max;
    add("BB", bb < 30 ? -15 : bb < 50 ? -8 : bb >= 75 ? 3 : 0);
  }
  if (checkin) {
    const avg = mean([checkin.energy, checkin.sleep, checkin.mood].filter((v): v is number => v !== null));
    if (avg !== null) add("CHECK-IN", avg < 1.7 ? -10 : avg < 2.4 ? -3 : 3);
  }
  const di = diary.find((d) => d.day === day) ?? diary.find((d) => d.day === addDays(day, -1));
  if (di) {
    const vals = Object.values(di.symptoms ?? {}) as number[];
    const strong = vals.filter((v) => v >= 3).length;
    const mid = vals.filter((v) => v === 2).length;
    const night = (di.symptoms ?? {}).nacht ?? 0;
    add("SYMPTOME", -Math.min(12, strong * 4 + mid * 2 + (night >= 2 ? 3 : 0)));
  }
  const cyc = cycleInfo(day, starts);
  if (cyc.cycleDay !== null && cyc.beforePeriod) {
    const p = cycleBeforeDiff(new Map(daily.map((d) => [d.day, d])), starts);
    if (p.ready && p.beforeDiff !== null && p.beforeDiff < -5) add("ZYKLUS", -5);
  }
  const pause = !!illness && (illness.fever || illness.below_neck || illness.severity >= 4);
  if (illness) add("KRANK", pause ? -100 : -25);
  const shown = factors.filter((f) => f.e !== 0);
  if (pause) return { score: 0, pause, lo: 0, hi: 15, factors: shown };
  const score = Math.max(0, Math.min(100, 80 + factors.reduce((s, f) => s + f.e, 0)));
  const band = BANDS.find((b) => score >= b.min)!;
  // Persönliches Ziel aus üblicher Belastung und Readiness (Nutzerin 24.11.), sonst feste Stufen
  const b = usual.usual === null ? band : targetBand(score, usual.usual, usual.brake);
  return { score, pause, lo: b.lo, hi: b.hi, factors: shown };
}

export const asDay = (r: Any): Day => ({
  day: r.day,
  hrv_last_night: r.hrv_last_night ?? null,
  resting_hr: r.resting_hr ?? null,
  bb_max: r.bb_max ?? null,
});
