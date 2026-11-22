// Persönlicher Bereich für jeden Wert: die letzten 30 Tage ohne heute, mittlere Hälfte der Werte.
// Fest: hängt nicht am gewählten Zeitraum einer Ansicht. Unter 14 Tagen Daten gibt es keinen Bereich.
// In der Lutealphase gilt für HRV, Ruhepuls und Temperatur zusätzlich ein eigener Bereich aus früheren Lutealphasen.
// Reine Berechnungen ohne Netzwerk. Ersetzt den alten Bereich aus Mittelwert ± Standardabweichung.

import { cycleToday } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";
import type { Daily, MetricKey } from "@/lib/garmin";
import { METRICS } from "@/lib/garmin";

export const RANGE_DAYS = 30; // Fenster für den Bereich
export const MIN_DAYS = 14; // so viele Tage mit Wert braucht ein Bereich
export const LUTEAL_LOOKBACK = 120; // etwa vier Zyklen für den Luteal-Bereich
export const NO_RANGE_TEXT = `Bereich ab ${MIN_DAYS} Tagen`;

// Für diese Werte verschiebt die Lutealphase das Übliche
export const CYCLE_SENSITIVE: MetricKey[] = ["hrv", "ruhepuls", "temperatur"];

export type Point = { day: string; value: number | null };

export type Range = {
  lo: number; // 25. Perzentil
  hi: number; // 75. Perzentil
  median: number;
  n: number; // Tage mit Wert
};

export type Position = "unter" | "im" | "über";

export type Baseline = {
  range: Range | null; // 30-Tage-Bereich
  luteal: Range | null; // nur gesetzt, wenn heute Lutealphase ist und genug frühere Luteal-Tage da sind
  inLuteal: boolean; // heute ist (geschätzt) Lutealphase
  // Der Bereich, an dem heute gemessen wird: in der Lutealphase der Luteal-Bereich, sonst der 30-Tage-Bereich
  active: Range | null;
};

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

// Mittlere Hälfte einer Werteliste, null unter MIN_DAYS Werten
export function middleHalf(values: number[], minDays = MIN_DAYS): Range | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < minDays) return null;
  return { lo: quantile(v, 0.25), hi: quantile(v, 0.75), median: quantile(v, 0.5), n: v.length };
}

const isLuteal = (day: string, diary: Diary[]) => {
  const p = cycleToday(day, diary).phase;
  return p === "luteal-frueh" || p === "luteal-spaet";
};

// ---------- Bereiche

// 30-Tage-Bereich: Tage day-30 bis day-1, heute zählt nicht mit
export function personalRange(series: Point[], day: string, days = RANGE_DAYS): Range | null {
  const from = addDays(day, -days);
  return middleHalf(series.filter((p) => p.day >= from && p.day < day && p.value !== null).map((p) => p.value as number));
}

// Luteal-Bereich: Luteal-Tage früherer Zyklen der letzten LUTEAL_LOOKBACK Tage, heute zählt nicht mit
export function lutealRange(series: Point[], diary: Diary[], day: string): Range | null {
  const from = addDays(day, -LUTEAL_LOOKBACK);
  return middleHalf(series.filter((p) => p.day >= from && p.day < day && p.value !== null && isLuteal(p.day, diary)).map((p) => p.value as number));
}

// Beide Bereiche für einen Tag. cycleSensitive: ob die Lutealphase für diesen Wert zählt.
export function baselineFor(series: Point[], day: string, diary: Diary[], cycleSensitive: boolean): Baseline {
  const range = personalRange(series, day);
  const inLuteal = cycleSensitive && isLuteal(day, diary);
  const luteal = inLuteal ? lutealRange(series, diary, day) : null;
  return { range, luteal, inLuteal, active: luteal ?? range };
}

// Bequem für Garmin-Werte: Reihe aus den Tageswerten, Luteal-Anpassung nach CYCLE_SENSITIVE
export function seriesOf(key: MetricKey, daily: Daily[]): Point[] {
  return daily.map((d) => ({ day: d.day, value: METRICS[key].value(d) }));
}

export function metricBaseline(key: MetricKey, daily: Daily[], diary: Diary[], day: string): Baseline {
  return baselineFor(seriesOf(key, daily), day, diary, CYCLE_SENSITIVE.includes(key));
}

// ---------- Einordnung

export function positionIn(value: number, range: Range): Position {
  return value < range.lo ? "unter" : value > range.hi ? "über" : "im";
}

// Kurzes Wort für die Bereichszeile, z. B. „im Bereich“
export function positionText(p: Position): string {
  return p === "im" ? "im Bereich" : p === "über" ? "über dem Bereich" : "unter dem Bereich";
}

// Zählt, wie viele Werte heute im eigenen Bereich liegen („4 von 5 Werten in deinem Bereich“)
export function countInRange(items: { value: number | null; range: Range | null }[]): { inRange: number; total: number } {
  const rated = items.filter((i) => i.value !== null && i.range !== null);
  return { inRange: rated.filter((i) => positionIn(i.value as number, i.range as Range) === "im").length, total: rated.length };
}
