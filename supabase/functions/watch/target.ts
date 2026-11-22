// Health Coach · Tagesziel ("Belastung heute"), Zyklustag und Phase für die Uhr.
// Gleiche Rechnung wie in der App (lib/insights.ts computeTarget, lib/cycle.ts phaseFor),
// hier für die Edge Function nachgebaut, weil sie die App-Dateien nicht laden kann.
// Wer die Rechnung in der App ändert, ändert sie hier mit.

// deno-lint-ignore no-explicit-any
type Any = any;

export type Day = { day: string; sleep_score: number | null; hrv_last_night: number | null; resting_hr: number | null; bb_max: number | null };
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
const sd = (v: number[]) => {
  const m = mean(v);
  return m === null || v.length < 2 ? null : Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

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

function zEffect(v: number | null, hist: number[], higherIsBetter: boolean, weight: number): number {
  if (v === null) return 0;
  const m = mean(hist);
  const s = sd(hist);
  if (m === null || s === null || s === 0 || hist.length < 7) return 0;
  const z = (v - m) / s;
  const bad = higherIsBetter ? -z : z;
  if (bad > 1.5) return -weight;
  if (bad > 0.75) return -Math.round(weight / 2);
  if (bad < -1) return Math.round(weight / 4);
  return 0;
}

// Tagesziel 0–100 wie computeTarget in der App
export function targetScore(day: string, daily: Day[], diary: DiaryRow[], checkin: Checkin, illness: Illness, starts: string[]): { score: number; pause: boolean } {
  const hist = daily.filter((r) => r.day < day && r.day >= addDays(day, -30));
  const today = daily.find((r) => r.day === day) ?? null;
  const num = (f: (r: Day) => number | null) => hist.map(f).filter((v): v is number => v !== null);
  let eff = 0;
  eff += zEffect(today?.sleep_score ?? null, num((r) => r.sleep_score), true, 10);
  eff += zEffect(today?.hrv_last_night ?? null, num((r) => r.hrv_last_night), true, 12);
  eff += zEffect(today?.resting_hr ?? null, num((r) => r.resting_hr), false, 8);
  if (today?.bb_max !== null && today?.bb_max !== undefined) {
    const bb = today.bb_max;
    eff += bb < 30 ? -15 : bb < 50 ? -8 : bb >= 75 ? 3 : 0;
  }
  if (checkin) {
    const avg = mean([checkin.energy, checkin.sleep, checkin.mood].filter((v): v is number => v !== null));
    if (avg !== null) eff += avg < 1.7 ? -10 : avg < 2.4 ? -3 : 3;
  }
  const di = diary.find((d) => d.day === day) ?? diary.find((d) => d.day === addDays(day, -1));
  if (di) {
    const vals = Object.values(di.symptoms ?? {}) as number[];
    const strong = vals.filter((v) => v >= 3).length;
    const mid = vals.filter((v) => v === 2).length;
    const night = (di.symptoms ?? {}).nacht ?? 0;
    eff += -Math.min(12, strong * 4 + mid * 2 + (night >= 2 ? 3 : 0));
  }
  const cyc = cycleInfo(day, starts);
  if (cyc.cycleDay !== null && cyc.beforePeriod) {
    const p = cycleBeforeDiff(new Map(daily.map((d) => [d.day, d])), starts);
    if (p.ready && p.beforeDiff !== null && p.beforeDiff < -5) eff += -5;
  }
  const pause = !!illness && (illness.fever || illness.below_neck || illness.severity >= 4);
  if (illness) eff += pause ? -100 : -25;
  if (pause) return { score: 0, pause };
  return { score: Math.max(0, Math.min(100, 80 + eff)), pause };
}

export const asDay = (r: Any): Day => ({
  day: r.day,
  sleep_score: r.sleep_score ?? null,
  hrv_last_night: r.hrv_last_night ?? null,
  resting_hr: r.resting_hr ?? null,
  bb_max: r.bb_max ?? null,
});
