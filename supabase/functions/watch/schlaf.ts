// Health Coach · Schlafwert 0–100 für die Uhr-Readiness.
// Gleiche Rechnung wie in der App (lib/schlaf.ts sleepScore, lib/today.ts sleepNeed),
// hier nachgebaut, weil die Edge Function die App-Dateien nicht laden kann.
// Wer die Rechnung in der App ändert, ändert sie hier mit.

import { rangeFor, type Range, type RangePhase } from "./target.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const lin = (v: number, zero: number, full: number) => clamp(((v - zero) / (full - zero)) * 100);
const fixed = (lo: number, hi: number): Range => ({ lo, hi, median: (lo + hi) / 2, stable: true });
const num = (v: Any): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const DEFAULT_NEED_H = 7.5;

// Lage im eigenen Bereich: Mitte 80, untere Grenze 60, obere 95, deutlich besser 100 (wie rangePoints in der App)
function rangePoints(v: number, r: Range, lower = false): number {
  const w = Math.max(r.hi - r.lo, Math.abs(r.median) * 0.05, 0.01);
  const x = lower ? 2 * r.median - v : v;
  const lo = lower ? 2 * r.median - r.hi : r.lo;
  const hi = lower ? 2 * r.median - r.lo : r.hi;
  if (x < lo) return lin(x, lo - 1.5 * w, lo) * 0.6;
  if (x < r.median) return 60 + ((x - lo) / Math.max(r.median - lo, 0.01)) * 20;
  if (x <= hi) return 80 + ((x - r.median) / Math.max(hi - r.median, 0.01)) * 15;
  return Math.min(100, 95 + ((x - hi) / (0.5 * w)) * 5);
}

const hours = (r: Any) => (r?.sleep_seconds ? r.sleep_seconds / 3600 : null);
const awakeMin = (r: Any) => (r && r.sleep_awake_s != null ? r.sleep_awake_s / 60 : null);
const efficiency = (r: Any) => (r?.sleep_seconds && r.sleep_awake_s != null ? (r.sleep_seconds / (r.sleep_seconds + r.sleep_awake_s)) * 100 : null);
const share = (s: Any, r: Any) => (s && r?.sleep_seconds ? (s / r.sleep_seconds) * 100 : null);
const startMin = (r: Any) => (r?.sleep_start_min == null ? null : r.sleep_start_min < 720 ? r.sleep_start_min + 1440 : r.sleep_start_min);
const endMin = (r: Any) => (r?.sleep_end_min == null ? null : r.sleep_end_min);

// Schlafwert der Nacht, die am Tag `day` endet. rows: garmin_daily (alle Spalten), acts: garmin_activities.
export function sleepTotal(day: string, rows: Any[], _acts: Any[], starts: string[], sick: Set<string>, phases: Map<string, RangePhase | null>): number | null {
  const by = new Map(rows.map((r) => [r.day, r]));
  const d = by.get(day);
  const h = hours(d);
  if (h === null) return null;

  // Menge am Grundbedarf wie sleepAchieved in lib/today.ts (Prüfaudit 26.11.): üblicher Schlaf (ab 14 Nächten), mindestens 7 h,
  // für die Bewertung höchstens 8 h. Schlafschuld und Belastung erhöhen nur den Bedarf der kommenden Nacht, nicht die Bewertung.
  const base = rangeFor(rows, day, hours, [], new Set(), new Map());
  const baseH = Math.max(7, base?.stable ? base.median : DEFAULT_NEED_H);
  const pct = Math.round((h / Math.min(8, baseH)) * 100);
  const amount = pct >= 100 ? Math.min(100, 85 + (pct - 100) * 1.5) : clamp(85 - (100 - pct) * 2);

  const parts: { w: number; p: number }[] = [];
  const cnt = num(d.awake_count);
  const aw = awakeMin(d);
  if (cnt !== null || aw !== null) parts.push({ w: 30, p: clamp(100 - (cnt ?? 0) * 10 - (aw !== null ? Math.max(0, aw - 10) * 1.5 : 0)) });
  const eff = efficiency(d);
  if (eff !== null) parts.push({ w: 20, p: lin(eff, 85, 98) });

  const own = (f: (r: Any) => number | null, fb: Range, cycle: boolean) => {
    const r = rangeFor(rows, day, f, cycle ? starts : [], sick, phases);
    return r?.stable ? r : fb;
  };
  const ph: number[] = [];
  const ds = share(d.sleep_deep_s, d);
  const rs = share(d.sleep_rem_s, d);
  if (ds !== null) ph.push(rangePoints(ds, own((r) => share(r.sleep_deep_s, r), fixed(13, 23), true)));
  if (rs !== null) ph.push(rangePoints(rs, own((r) => share(r.sleep_rem_s, r), fixed(18, 25), true)));
  if (ph.length) parts.push({ w: 25, p: ph.reduce((a, b) => a + b, 0) / ph.length });

  const last7 = Array.from({ length: 7 }, (_, i) => by.get(addDays(day, -1 - i)));
  const mean = (f: (r: Any) => number | null) => {
    const v = last7.map(f).filter((x): x is number => x !== null);
    return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const s0 = startMin(d), e0 = endMin(d), ms = mean(startMin), me = mean(endMin);
  const devs = [s0 !== null && ms !== null ? s0 - ms : null, e0 !== null && me !== null ? e0 - me : null].filter((x): x is number => x !== null);
  if (devs.length) parts.push({ w: 10, p: lin(Math.max(...devs.map(Math.abs)), 75, 10) });

  const body: number[] = [];
  for (const [f, lower] of [[(r: Any) => num(r.resting_hr), true], [(r: Any) => num(r.hrv_last_night), false], [(r: Any) => (r.respiration_avg == null ? null : Number(r.respiration_avg)), true]] as [(r: Any) => number | null, boolean][]) {
    const v = f(d);
    const r = rangeFor(rows, day, f, starts, sick, phases);
    if (v !== null && r?.stable) body.push(rangePoints(v, r, lower));
  }
  if (body.length) parts.push({ w: 15, p: body.reduce((a, b) => a + b, 0) / body.length });

  const w = parts.reduce((a, p) => a + p.w, 0);
  const rest = parts.length >= 3 ? Math.round(parts.reduce((a, p) => a + p.p * p.w, 0) / w) : null;
  return Math.round(rest === null ? amount : (amount + rest) / 2);
}
