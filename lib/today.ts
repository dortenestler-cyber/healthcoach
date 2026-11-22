// Werte für die Seite Heute: Schlafbedarf, Last der letzten 7 Tage, Beitragsfaktoren und Vitalwerte.
// Reine Berechnungen ohne Netzwerk. Alle Bereiche kommen aus lib/baseline.ts (30 Tage, mittlere Hälfte).
// Die Regeln für den Schlafbedarf sind Startwerte zum Kalibrieren, keine medizinische Empfehlung.

import { baselineFor, metricBaseline, middleHalf, type Baseline, type Range } from "@/lib/baseline";
import { METRICS, type Activity, type Daily, type MetricKey } from "@/lib/garmin";
import { loadPercent, type Data } from "@/lib/insights";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const sleepHours = (d: Daily | undefined) => (d?.sleep_seconds ? d.sleep_seconds / 3600 : null);

// ---------- Schlafbedarf

export const DEFAULT_NEED_H = 7.5; // Startwert, solange es weniger als 14 Nächte gibt
const DEBT_CAP_MIN = 60; // höchstens eine Stunde Zuschlag aus der Schlafschuld
const HARD_DAY_PCT = 70; // Belastung gestern ab hier: harte Einheit
const MID_DAY_PCT = 40;

export type SleepNeed = {
  hours: number; // gesamter Bedarf in Stunden
  baseH: number; // Grundbedarf
  baseFromData: boolean; // false: Startwert 7,5 h
  debtH: number; // Schlafschuld der letzten 7 Nächte (Summe)
  debtAddMin: number; // Zuschlag daraus in Minuten
  loadAddMin: number; // Zuschlag nach Belastung gestern
};

// Bedarf für die Nacht nach `day`. Grundbedarf: dein üblicher Schlaf (Median der letzten 30 Nächte).
// Schlafschuld: Summe der fehlenden Stunden der letzten 7 Nächte, davon ein Siebtel als Zuschlag, höchstens 60 Minuten.
// Zuschlag nach Belastung am Tag: 20 Minuten nach einer harten Einheit, 10 nach einer mittleren.
export function sleepNeed(day: string, daily: Daily[], acts: Activity[]): SleepNeed {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const range = baselineFor(daily.map((d) => ({ day: d.day, value: sleepHours(d) })), addDays(day, 1), [], false).range;
  const baseH = range ? range.median : DEFAULT_NEED_H;
  let debtH = 0;
  for (let i = 0; i < 7; i++) {
    const h = sleepHours(byDay.get(addDays(day, -i)));
    if (h !== null) debtH += Math.max(0, baseH - h);
  }
  const debtAddMin = Math.min(DEBT_CAP_MIN, Math.round((debtH * 60) / 7));
  const load = loadPercent(day, daily, acts);
  const loadAddMin = load >= HARD_DAY_PCT ? 20 : load >= MID_DAY_PCT ? 10 : 0;
  return { hours: baseH + (debtAddMin + loadAddMin) / 60, baseH, baseFromData: !!range, debtH, debtAddMin, loadAddMin };
}

// Dauer wie „7 h 55“
export function hm(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

// Letzte Nacht im Verhältnis zum Bedarf, der für sie galt (Garmin ordnet die Nacht dem Aufwachtag zu)
export function sleepAchieved(day: string, data: Data): { hours: number | null; need: SleepNeed; ratio: number | null } {
  const hours = sleepHours(data.daily.find((d) => d.day === day));
  const need = sleepNeed(addDays(day, -1), data.daily, data.acts);
  return { hours, need, ratio: hours === null ? null : hours / need.hours };
}

// ---------- Last der letzten 7 Tage

// Trainingslast pro Tag aus den Garmin-Aktivitäten
export function loadByDay(acts: Activity[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of acts) {
    const d = (a.start_local ?? "").slice(0, 10);
    if (d) m.set(d, (m.get(d) ?? 0) + (a.training_load ?? 0));
  }
  return m;
}

const sum7 = (m: Map<string, number>, day: string) => Array.from({ length: 7 }, (_, i) => m.get(addDays(day, -i)) ?? 0).reduce((a, b) => a + b, 0);

// Summe der letzten 7 Tage bis einschließlich heute, Bereich aus den 7-Tage-Summen der 30 Tage davor
export function load7(day: string, data: Data): { value: number | null; range: Range | null } {
  if (!data.acts.length) return { value: null, range: null };
  const m = loadByDay(data.acts);
  const first = [...m.keys()].sort()[0];
  const sums: number[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = addDays(day, -i);
    if (d >= addDays(first, 6)) sums.push(sum7(m, d)); // erst ab einer vollen Woche Daten
  }
  return { value: Math.round(sum7(m, day)), range: middleHalf(sums) };
}

// ---------- Beitragsfaktoren der Readiness und Vitalwerte

export type Row = { key: string; label: string; value: number | null; fmt: (v: number) => string; base: Baseline; href?: string };

const today = (key: MetricKey, day: string, daily: Daily[]) => {
  const d = daily.find((r) => r.day === day);
  return d ? METRICS[key].value(d) : null;
};

function metricRow(key: MetricKey, day: string, data: Data, label = METRICS[key].label): Row {
  return { key, label, value: today(key, day, data.daily), fmt: METRICS[key].fmt, base: metricBaseline(key, data.daily, data.diary, day), href: `/verlauf?m=${key}` };
}

const plain = (range: Range | null): Baseline => ({ range, luteal: null, inLuteal: false, active: range });

// HRV, Ruhepuls, Schlaf und Last: was in die Readiness einfließt
export function readinessFactors(day: string, data: Data): Row[] {
  const l = load7(day, data);
  return [
    metricRow("hrv", day, data),
    metricRow("ruhepuls", day, data),
    metricRow("schlaf", day, data),
    { key: "last", label: "Last 7 Tage", value: l.value, fmt: (v) => String(Math.round(v)), base: plain(l.range) },
  ];
}

// Vitalwerte der letzten Nacht. Atemfrequenz und Hauttemperatur nur, wenn es Werte gibt.
export function vitalRows(day: string, data: Data): Row[] {
  const keys: MetricKey[] = ["hrv", "ruhepuls", "bb", "stress"];
  if (data.daily.some((d) => typeof d.skin_temp_delta === "number")) keys.splice(2, 0, "temperatur");
  if (data.daily.some((d) => typeof d.respiration_avg === "number")) keys.splice(2, 0, "atem");
  return keys.map((k) => metricRow(k, day, data, k === "temperatur" ? "Hauttemperatur" : undefined));
}

// ---------- Belastungsziel

// Satz zum Belastungsziel (auch auf der Seite Tagesziel)
export function targetText(t: { pause: boolean; lo: number; hi: number }, load: number): string {
  if (t.pause) return "Heute ist Erholung dran. Dein Körper braucht die Kraft für die Genesung.";
  if (load < t.lo) return `Noch ${t.lo - load} % bis zum Zielbereich. Eine Einheit wie geplant bringt dich hinein.`;
  if (load <= t.hi) return "Du bist im Zielbereich. Ab jetzt nur noch locker, etwa Gehen.";
  return "Über dem Ziel. Plane morgen eher leicht.";
}
