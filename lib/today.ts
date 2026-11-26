// Werte für die Seite Heute: Schlafbedarf, Last der letzten 7 Tage, Beitragsfaktoren und Vitalwerte.
// Reine Berechnungen ohne Netzwerk. Alle Bereiche kommen aus lib/baseline.ts (30 Tage, mittlere Hälfte).
// Die Regeln für den Schlafbedarf sind Startwerte zum Kalibrieren, keine medizinische Empfehlung.

import { baselineFor, metricBaseline, positionIn, metricRangeSeries, middleHalf, seriesOf, type Baseline, type Range } from "@/lib/baseline";
import { badStreak } from "@/lib/korridor";
import { METRICS, type Activity, type Daily, type MetricKey } from "@/lib/garmin";
import { HARD_DAY_PCT, loadPercent, MID_DAY_PCT, type Data } from "@/lib/insights";
import { readLoadDay } from "@/lib/alltagslast";
import { sleepScore } from "@/lib/schlaf";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const sleepHours = (d: Daily | undefined) => (d?.sleep_seconds ? d.sleep_seconds / 3600 : null);

// ---------- Schlafbedarf

export const DEFAULT_NEED_H = 7.5; // Startwert, solange es weniger als 14 Nächte gibt
export const MIN_NEED_H = 7; // Untergrenze: Empfehlung für Erwachsene, damit sich ein Defizit nicht als üblich einschleicht
export const GRADE_MAX_H = 8; // Für die Bewertung gilt höchstens dieser Bedarf: ab 8 Stunden ist eine Nacht nie „knapp“
const DEBT_CAP_MIN = 60; // höchstens eine Stunde Zuschlag aus der Schlafschuld

export type SleepNeed = {
  hours: number; // gesamter Bedarf in Stunden
  baseH: number; // Grundbedarf
  baseFromData: boolean; // false: Startwert 7,5 h
  baseRaised: boolean; // dein üblicher Schlaf liegt unter 7 h, der Grundbedarf wurde angehoben
  gradeH: number; // Maßstab für Menge und Satz: Grundbedarf, begrenzt auf 7–8 h, ohne Zuschläge
  debtH: number; // Schlafschuld der letzten 7 Nächte (Summe)
  debtAddMin: number; // Zuschlag daraus in Minuten
  loadAddMin: number; // Zuschlag nach Belastung gestern
};

// Bedarf für die Nacht nach `day`. Grundbedarf: dein üblicher Schlaf (Median der letzten 30 Nächte), mindestens 7 Stunden.
// Die Zuschläge sind eine Empfehlung für die kommende Nacht. Bewertet wird die Nacht nur am Grundbedarf (gradeH),
// sonst läge eine gewöhnliche Nacht fast immer unter 100 % und hieße „knapp“.
// Schlafschuld: Summe der fehlenden Stunden der letzten 7 Nächte, davon ein Siebtel als Zuschlag, höchstens 60 Minuten.
// Zuschlag nach Belastung am Tag: 20 Minuten nach einer harten Einheit, 10 nach einer mittleren.
export function sleepNeed(day: string, daily: Daily[], acts: Activity[]): SleepNeed {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const range = baselineFor(daily.map((d) => ({ day: d.day, value: sleepHours(d) })), addDays(day, 1), { diary: [] }, false).range;
  const stable = range?.stable ? range : null; // erst ab 14 Nächten eigener Grundbedarf
  const baseH = Math.max(MIN_NEED_H, stable ? stable.median : DEFAULT_NEED_H);
  let debtH = 0;
  for (let i = 0; i < 7; i++) {
    const h = sleepHours(byDay.get(addDays(day, -i)));
    if (h !== null) debtH += Math.max(0, baseH - h);
  }
  const debtAddMin = Math.min(DEBT_CAP_MIN, Math.round((debtH * 60) / 7));
  const load = loadPercent(day, daily, acts);
  const loadAddMin = load >= HARD_DAY_PCT ? 20 : load >= MID_DAY_PCT ? 10 : 0;
  return { hours: baseH + (debtAddMin + loadAddMin) / 60, baseH, baseFromData: !!stable, baseRaised: !!stable && stable.median < MIN_NEED_H, gradeH: Math.min(GRADE_MAX_H, baseH), debtH, debtAddMin, loadAddMin };
}

// Dauer wie „7 h 55“
export function hm(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

// Letzte Nacht im Verhältnis zum Grundbedarf, der für sie galt (Garmin ordnet die Nacht dem Aufwachtag zu)
export function sleepAchieved(day: string, data: Data): { hours: number | null; need: SleepNeed; ratio: number | null } {
  const hours = sleepHours(data.daily.find((d) => d.day === day));
  const need = sleepNeed(addDays(day, -1), data.daily, data.acts);
  return { hours, need, ratio: hours === null ? null : hours / need.gradeH };
}

// ---------- Last der letzten 7 Tage

// Last pro Tag: Trainingslast der Garmin-Aktivitäten, mit daily zusätzlich die Last aus dem Alltag (gleiche Einheit)
export function loadByDay(acts: Activity[], daily?: Daily[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of acts) {
    const d = (a.start_local ?? "").slice(0, 10);
    if (d) m.set(d, (m.get(d) ?? 0) + (a.training_load ?? 0));
  }
  for (const r of daily ?? []) {
    const ld = readLoadDay(r.load_daily_min);
    if (!ld) continue;
    if (!m.has(r.day) && ld.last_training) m.set(r.day, ld.last_training);
    if (ld.last_alltag) m.set(r.day, (m.get(r.day) ?? 0) + ld.last_alltag);
  }
  return m;
}

const sum7 = (m: Map<string, number>, day: string) => Array.from({ length: 7 }, (_, i) => m.get(addDays(day, -i)) ?? 0).reduce((a, b) => a + b, 0);

// Summe der letzten 7 Tage bis einschließlich heute, Bereich aus den 7-Tage-Summen der 30 Tage davor
export function load7(day: string, data: Data): { value: number | null; range: Range | null } {
  const m = loadByDay(data.acts, data.daily);
  if (!m.size) return { value: null, range: null };
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

export function metricRow(key: MetricKey, day: string, data: Data, label = METRICS[key].label): Row {
  return { key, label, value: today(key, day, data.daily), fmt: METRICS[key].fmt, base: metricBaseline(key, data.daily, { diary: data.diary, sick: data.sick }, day), href: `/wert/${key}` };
}

const plain = (range: Range | null): Baseline => ({ range, phase: null, phaseKey: null, active: range });

// Schlaf als Gesamtwert (lib/schlaf.ts): ab 70 im Bereich, ab 85 darüber
function sleepRow(day: string, data: Data): Row {
  return { key: "schlaf", label: "Schlaf", value: sleepScore(day, data).total, fmt: (v) => String(Math.round(v)), base: plain({ lo: 70, hi: 84.5, median: 78, n: 30, stable: true }), href: "/wert/schlaf" };
}

// HRV, Ruhepuls, Schlaf und Last: was in die Readiness einfließt
export function readinessFactors(day: string, data: Data): Row[] {
  const l = load7(day, data);
  return [
    metricRow("hrv", day, data),
    metricRow("ruhepuls", day, data),
    sleepRow(day, data),
    { key: "last", label: "Belastung 7 Tage", value: l.value, fmt: (v) => String(Math.round(v)), base: plain(l.range) },
  ];
}

// Vitalwerte der letzten Nacht. Atemfrequenz nur, wenn es Werte gibt.
export function vitalRows(day: string, data: Data): Row[] {
  const keys: MetricKey[] = ["hrv", "ruhepuls", "bb", "stress"];
  if (data.daily.some((d) => typeof d.respiration_avg === "number")) keys.splice(2, 0, "atem");
  return keys.map((k) => metricRow(k, day, data));
}

// ---------- Belastungsziel

// Satz zum Belastungsziel (auch auf der Seite Tagesziel)
export function targetText(t: { pause: boolean; lo: number; hi: number }, load: number): string {
  if (t.pause) return "Heute ist Erholung dran. Dein Körper braucht die Kraft für die Genesung.";
  if (load < t.lo) return `Noch ${t.lo - load} % bis zum Zielbereich. Eine Einheit wie geplant bringt dich hinein.`;
  if (load <= t.hi) return "Du bist im Zielbereich. Ab jetzt nur noch locker, etwa Gehen.";
  return "Über dem Ziel. Plane morgen eher leicht.";
}

// Woher das Ziel kommt (Konzept docs/konzept-belastung-skala.md)
export function targetBasisText(t: { pause: boolean; usual: number | null; brake: boolean; label: string }): string | null {
  if (t.pause) return null;
  if (t.usual === null) return "Das Ziel richtet sich nach deiner Readiness. Ab 14 Tagen mit Daten kommt deine übliche Belastung dazu.";
  const brake = t.brake ? " Deine Belastung ist in den letzten 7 Tagen schnell gestiegen, deshalb liegt das Ziel heute nicht höher als sonst." : "";
  return `Das Ziel richtet sich nach deiner Readiness (${t.label}) und deiner üblichen Belastung von ${t.usual} %.${brake}`;
}

export const LOAD_CURVE_TEXT = "Je höher die Belastung schon ist, desto weniger bringt jede weitere Minute. 100 % entspricht einem harten Trainingstag, an sehr langen Tagen geht es darüber.";

// ---------- Werte, die seit Tagen auf der ungünstigen Seite ihres Bereichs liegen (Heute)

export type OffStreak = { key: MetricKey; label: string; days: number; side: "über" | "unter" };

const STREAK_MIN = 3;

// Je Wert: seit wie vielen Tagen mit Wert er auf der ungünstigen Seite liegt (gemessen am Bereich, der an dem Tag galt)
export function offStreaks(day: string, data: Data, keys: MetricKey[] = ["hrv", "ruhepuls", "schlaf", "atem", "stress"]): OffStreak[] {
  const ctx = { diary: data.diary, sick: data.sick };
  const days = Array.from({ length: 14 }, (_, i) => addDays(day, i - 13));
  const out: OffStreak[] = [];
  for (const key of keys) {
    const m = METRICS[key];
    if (!data.daily.some((d) => d.day === day && m.value(d) !== null)) continue; // nur mit Wert von heute
    const bands = metricRangeSeries(key, data.daily, ctx, days);
    const n = badStreak(seriesOf(key, data.daily), new Map(days.map((d, i) => [d, bands[i]])), day, m.higherIsBetter);
    if (n >= STREAK_MIN) out.push({ key, label: m.label, days: n, side: m.higherIsBetter ? "unter" : "über" });
  }
  return out.sort((a, b) => b.days - a.days);
}

// ---------- Satz zur Readiness (Heute und Detailseite)

const joinDe = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);

// Ein Satz, warum die Readiness so ist: welche Faktoren über, unter oder in deinem Bereich liegen
export function readinessWhy(factors: Row[], label: string): string | null {
  const over: string[] = [];
  const under: string[] = [];
  const typical: string[] = [];
  for (const f of factors) {
    if (f.value === null || !f.base.active) continue;
    const p = positionIn(f.value, f.base.active);
    (p === "über" ? over : p === "unter" ? under : typical).push(f.label);
  }
  if (!over.length && !under.length && !typical.length) return null;
  const s: string[] = [];
  if (over.length) s.push(`${joinDe(over)} ${over.length > 1 ? "liegen" : "liegt"} über deinem Bereich`);
  if (under.length) s.push(`${joinDe(under)} ${under.length > 1 ? "liegen" : "liegt"} unter deinem Bereich`);
  if (typical.length) s.push(`${joinDe(typical)} ${typical.length > 1 ? "sind" : "ist"} typisch`);
  return `${s.join(", ")}. Darum heute „${label}“.`;
}
