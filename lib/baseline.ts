// Persönlicher Bereich (Korridor) für jeden Wert: die letzten 30 Tage ohne heute, mittlere Hälfte der Werte.
// Ab 7 Tagen gibt es einen vorläufigen Bereich, ab 14 Tagen gilt er als stabil. Nur stabile Bereiche zählen für die Readiness.
// Für zyklusabhängige Werte (HRV, Ruhepuls, Temperatur, Atemfrequenz, Schlaf) gilt je Zyklusphase ein eigener Bereich
// aus denselben Phasen der letzten etwa fünf Zyklen. Fehlt die Phase oder gibt es zu wenige Tage, gilt der 30-Tage-Bereich.
// Krankheitstage und die 3 Tage danach zählen nicht mit, damit eine Erkältung den Bereich nicht verschiebt.
// Der Bereich kann für jeden Tag so berechnet werden, wie er an diesem Tag galt (wandernder Korridor).
// Reine Berechnungen ohne Netzwerk.

import { cycleToday } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";
import type { Daily, MetricKey } from "@/lib/garmin";
import { METRICS } from "@/lib/garmin";

export const RANGE_DAYS = 30; // Fenster für den Bereich
export const MIN_DAYS = 14; // ab so vielen Tagen mit Wert ist ein Bereich stabil
export const MIN_PROVISIONAL = 7; // ab so vielen Tagen gibt es einen vorläufigen Bereich
export const PHASE_LOOKBACK = 150; // etwa fünf Zyklen für die Bereiche je Phase
export const MIN_PHASE_DAYS = 10; // so viele Tage braucht ein Bereich je Phase
export const SICK_AFTER = 3; // Tage nach einer Krankheit, die noch nicht mitzählen
export const NO_RANGE_TEXT = `Bereich ab ${MIN_PROVISIONAL} Tagen`;

// Für diese Werte verschiebt die Zyklusphase das Übliche
export const CYCLE_SENSITIVE: MetricKey[] = ["hrv", "ruhepuls", "temperatur", "atem", "schlaf", "tiefschlaf", "rem"];

export type Point = { day: string; value: number | null };

export type Range = {
  lo: number; // 25. Perzentil
  hi: number; // 75. Perzentil
  median: number;
  n: number; // Tage mit Wert
  stable: boolean; // ab MIN_DAYS Tagen, sonst vorläufig
};

export type Position = "unter" | "im" | "über";

// Zyklusphasen für die Bereiche: frühe und späte Lutealphase zählen zusammen
export type RangePhase = "menstruation" | "follikel" | "eisprung" | "luteal";
export const RANGE_PHASE_NAMES: Record<RangePhase, string> = {
  menstruation: "Menstruation",
  follikel: "Follikelphase",
  eisprung: "Eisprung-Fenster",
  luteal: "Lutealphase",
};

export type Baseline = {
  range: Range | null; // 30-Tage-Bereich
  phase: Range | null; // Bereich der heutigen Zyklusphase, nur bei zyklusabhängigen Werten mit genug Tagen
  phaseKey: RangePhase | null; // heutige Phase (geschätzt), nur bei zyklusabhängigen Werten
  // Der Bereich, an dem heute gemessen wird: der Bereich der Phase, sonst der 30-Tage-Bereich
  active: Range | null;
};

// Was ein Bereich zusätzlich wissen muss: Zyklus und Krankheitstage
export type BaseCtx = { diary: Diary[]; sick?: Set<string> };

// ---------- Hilfen

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Perzentil mit linearer Interpolation, v muss sortiert sein
function quantile(v: number[], q: number): number {
  const pos = (v.length - 1) * q;
  const i = Math.floor(pos);
  const f = pos - i;
  return i + 1 < v.length ? v[i] + f * (v[i + 1] - v[i]) : v[i];
}

// Mittlere Hälfte einer Werteliste, null unter minDays Werten
export function middleHalf(values: number[], minDays = MIN_DAYS): Range | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < minDays) return null;
  return { lo: quantile(v, 0.25), hi: quantile(v, 0.75), median: quantile(v, 0.5), n: v.length, stable: v.length >= MIN_DAYS };
}

// Phase eines Tags für die Bereiche. Liegt die letzte Periode weit zurück (z. B. Perimenopause), gibt es keine Phase.
export function rangePhaseOf(day: string, diary: Diary[]): RangePhase | null {
  const c = cycleToday(day, diary);
  if (c.cycleDay === null || c.phase === null || c.cycleDay > c.length + 10) return null;
  return c.phase === "luteal-frueh" || c.phase === "luteal-spaet" ? "luteal" : c.phase;
}

// Phasen für viele Tage auf einmal (spart Rechenzeit beim wandernden Korridor)
// Zwischenspeicher je Tagebuch, damit viele Bereiche hintereinander die Phasen nicht neu rechnen
const phaseCache = new WeakMap<Diary[], Map<string, RangePhase | null>>();
function phaseMap(days: string[], diary: Diary[]): Map<string, RangePhase | null> {
  let m = phaseCache.get(diary);
  if (!m) {
    m = new Map();
    phaseCache.set(diary, m);
  }
  if (!diary.length) return m;
  for (const d of days) if (!m.has(d)) m.set(d, rangePhaseOf(d, diary));
  return m;
}

// Krankheitstage aus den Erkrankungen: Beginn bis Ende (offen: bis heute), dazu SICK_AFTER Tage danach
export function sickDays(illnesses: { started_on: string; ended_on: string | null }[], today: string): Set<string> {
  const out = new Set<string>();
  for (const i of illnesses) {
    const end = addDays(i.ended_on ?? today, SICK_AFTER);
    for (let d = i.started_on; d <= end && d <= today; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

// ---------- Bereiche

const usable = (p: Point, sick?: Set<string>) => p.value !== null && !sick?.has(p.day);

// 30-Tage-Bereich: Tage day-30 bis day-1, heute und Krankheitstage zählen nicht
export function personalRange(series: Point[], day: string, days = RANGE_DAYS, sick?: Set<string>): Range | null {
  const from = addDays(day, -days);
  return middleHalf(series.filter((p) => p.day >= from && p.day < day && usable(p, sick)).map((p) => p.value as number), MIN_PROVISIONAL);
}

// Bereich einer Phase: Tage derselben Phase der letzten PHASE_LOOKBACK Tage, heute und Krankheitstage zählen nicht
function phaseRangeWith(series: Point[], phases: Map<string, RangePhase | null>, phase: RangePhase, day: string, sick?: Set<string>): Range | null {
  const from = addDays(day, -PHASE_LOOKBACK);
  const v = series.filter((p) => p.day >= from && p.day < day && usable(p, sick) && phases.get(p.day) === phase).map((p) => p.value as number);
  return v.length >= MIN_PHASE_DAYS ? middleHalf(v, MIN_PHASE_DAYS) : null;
}

export function phaseRange(series: Point[], ctx: BaseCtx, phase: RangePhase, day: string): Range | null {
  return phaseRangeWith(series, phaseMap(series.map((p) => p.day), ctx.diary), phase, day, ctx.sick);
}

// Beide Bereiche für einen Tag. cycleSensitive: ob die Zyklusphase für diesen Wert zählt.
export function baselineFor(series: Point[], day: string, ctx: BaseCtx, cycleSensitive: boolean): Baseline {
  const range = personalRange(series, day, RANGE_DAYS, ctx.sick);
  const phaseKey = cycleSensitive ? rangePhaseOf(day, ctx.diary) : null;
  const phase = phaseKey ? phaseRange(series, ctx, phaseKey, day) : null;
  return { range, phase, phaseKey, active: phase ?? range };
}

// Wandernder Korridor: für jeden Tag der Bereich, der an diesem Tag galt (Phase, sonst 30 Tage)
export function rangeSeries(series: Point[], days: string[], ctx: BaseCtx, cycleSensitive: boolean): (Range | null)[] {
  const phases = cycleSensitive ? phaseMap([...series.map((p) => p.day), ...days], ctx.diary) : new Map<string, RangePhase | null>();
  return days.map((d) => {
    const ph = cycleSensitive ? phases.get(d) ?? null : null;
    const r = ph ? phaseRangeWith(series, phases, ph, d, ctx.sick) : null;
    return r ?? personalRange(series, d, RANGE_DAYS, ctx.sick);
  });
}

// Bequem für Garmin-Werte: Reihe aus den Tageswerten, Phasen nach CYCLE_SENSITIVE
export function seriesOf(key: MetricKey, daily: Daily[]): Point[] {
  return daily.map((d) => ({ day: d.day, value: METRICS[key].value(d) }));
}

export function metricBaseline(key: MetricKey, daily: Daily[], ctx: BaseCtx, day: string): Baseline {
  return baselineFor(seriesOf(key, daily), day, ctx, CYCLE_SENSITIVE.includes(key));
}

export function metricRangeSeries(key: MetricKey, daily: Daily[], ctx: BaseCtx, days: string[]): (Range | null)[] {
  return rangeSeries(seriesOf(key, daily), days, ctx, CYCLE_SENSITIVE.includes(key));
}

// ---------- Einordnung

export function positionIn(value: number, range: Range): Position {
  return value < range.lo ? "unter" : value > range.hi ? "über" : "im";
}

// Kurzes Wort für die Bereichszeile, z. B. „im Bereich“
export function positionText(p: Position): string {
  return p === "im" ? "im Bereich" : p === "über" ? "über dem Bereich" : "unter dem Bereich";
}

// Name des Bereichs, an dem heute gemessen wird, z. B. „Bereich Lutealphase“ oder „Dein Bereich“
export function activeName(b: Pick<Baseline, "phase" | "phaseKey">): string {
  return b.phase && b.phaseKey ? `Bereich ${RANGE_PHASE_NAMES[b.phaseKey]}` : "Dein Bereich";
}

// Zählt, wie viele Werte heute im eigenen stabilen Bereich liegen („4 von 5 Werten in deinem Bereich“)
export function countInRange(items: { value: number | null; range: Range | null }[]): { inRange: number; total: number } {
  const rated = items.filter((i) => i.value !== null && i.range !== null && i.range.stable);
  return { inRange: rated.filter((i) => positionIn(i.value as number, i.range as Range) === "im").length, total: rated.length };
}
