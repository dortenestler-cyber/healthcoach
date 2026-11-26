// Belastung über die Zeit: Cardio und Muskeln mit Zustand je Tag (Konzept docs/konzept-belastung-ueber-zeit.md).
// Reine Berechnungen ohne Netzwerk. Grenzen sind Startwerte, keine Aussage zum Verletzungsrisiko.

import type { Activity } from "@/lib/garmin";
import { baselineFor } from "@/lib/baseline";
import { loadToPct, readLoadDay } from "@/lib/alltagslast";
import { sportOf, type Sport } from "@/lib/training";
import type { Data, DoneSession } from "@/lib/insights";
import { RATIO_HI, RATIO_LO } from "@/lib/trainingLoad";

export type Zustand = "kalibrieren" | "abbau" | "optimal" | "muede" | "steigt";
export const ZUSTAND_NAMEN: Record<Zustand, string> = {
  kalibrieren: "Kalibrieren",
  abbau: "Abbau",
  optimal: "Optimal",
  muede: "Müde",
  steigt: "Steigt schnell",
};
export const ZUSTAND_REIHE: Zustand[] = ["optimal", "muede", "steigt", "abbau", "kalibrieren"];

export type ZeitPunkt = {
  day: string;
  value: number | null; // Schnitt der letzten 7 Tage
  lo: number | null; // optimaler Bereich: 80–130 % des Tagesschnitts der 4 Wochen davor
  hi: number | null;
  zustand: Zustand | null; // null: vor dem ersten Tag mit Daten
};

const WEEK = 7;
const BEFORE = 28;
export const CALIBRATE_DAYS = WEEK + BEFORE - 1; // erst ab 5 Wochen Daten gibt es eine Einordnung

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const meanBack = (m: Map<string, number>, day: string, len: number) => Array.from({ length: len }, (_, i) => m.get(addDays(day, -i)) ?? 0).reduce((a, b) => a + b, 0) / len;

// Wert, Bereich und Zustand für jeden Tag aus Tageswerten. tired(day): nur für Cardio (Readiness), Muskeln ohne „Müde“.
export function series(perDay: Map<string, number>, days: string[], first: string | null, tired?: (day: string) => boolean): ZeitPunkt[] {
  return days.map((day) => {
    if (!first || day < first) return { day, value: null, lo: null, hi: null, zustand: null };
    const value = meanBack(perDay, day, WEEK);
    if (addDays(day, -CALIBRATE_DAYS) < first) return { day, value, lo: null, hi: null, zustand: "kalibrieren" };
    const before = meanBack(perDay, addDays(day, -WEEK), BEFORE);
    if (before <= 0) return { day, value, lo: null, hi: null, zustand: "kalibrieren" };
    const lo = before * RATIO_LO;
    const hi = before * RATIO_HI;
    const zustand: Zustand = value < lo ? "abbau" : tired?.(day) ? "muede" : value > hi ? "steigt" : "optimal";
    return { day, value, lo, hi, zustand };
  });
}

// ---------- Cardio: Tagesbelastung in % (abflachende Skala), mit oder ohne Alltag

export function cardioPerDay(data: Data, alltag: boolean): { perDay: Map<string, number>; first: string | null } {
  const raw = new Map<string, number>();
  for (const a of data.acts) {
    const d = (a.start_local ?? "").slice(0, 10);
    if (d) raw.set(d, (raw.get(d) ?? 0) + (a.training_load ?? 0));
  }
  for (const r of data.daily) {
    const ld = readLoadDay(r.load_daily_min);
    if (!ld) {
      if (!raw.has(r.day)) raw.set(r.day, 0);
      continue;
    }
    if (!raw.get(r.day) && ld.last_training) raw.set(r.day, ld.last_training);
    if (alltag && ld.last_alltag) raw.set(r.day, (raw.get(r.day) ?? 0) + ld.last_alltag);
  }
  const perDay = new Map([...raw].map(([d, v]) => [d, loadToPct(v)]));
  return { perDay, first: [...perDay.keys()].sort()[0] ?? null };
}

// Müde: HRV unter oder Ruhepuls über deinem Bereich, an diesem Tag und am Tag davor (Bereich wie in der Readiness)
export function tiredCheck(data: Data): (day: string) => boolean {
  const ctx = { diary: data.diary, sick: data.sick };
  const hrv = data.daily.map((r) => ({ day: r.day, value: r.hrv_last_night }));
  const rhr = data.daily.map((r) => ({ day: r.day, value: r.resting_hr }));
  const byDay = new Map(data.daily.map((r) => [r.day, r]));
  const off = (day: string) => {
    const r = byDay.get(day);
    if (!r) return false;
    const h = r.hrv_last_night !== null ? baselineFor(hrv, day, ctx, true).active : null;
    const p = r.resting_hr !== null ? baselineFor(rhr, day, ctx, true).active : null;
    return (!!h?.stable && r.hrv_last_night! < h.lo) || (!!p?.stable && r.resting_hr! > p.hi);
  };
  const memo = new Map<string, boolean>();
  const offM = (d: string) => {
    if (!memo.has(d)) memo.set(d, off(d));
    return memo.get(d)!;
  };
  return (day) => offM(day) && offM(addDays(day, -1));
}

// ---------- Muskeln: Kettlebell-Sätze, Bouldern und Karate

export type KbSet = { day: string; reps: number; weight_kg: number; exercise?: string | null };
export type ClimbRow = { day: string; grade: string; result: string };

// Übung nach beteiligter Muskelmasse (Prüfaudit 26.11., Empfehlung 13, wie Whoop Muscular Load):
// Ganzkörper, Beine und Hüfte 1,2 · Oberkörper und gemischte Übungen 1,0 · kleine Übungen 0,5. Unbekannt: 1,0.
export function exerciseFactor(name: string | null | undefined): number {
  const n = (name ?? "").toLowerCase();
  if (/curl|trizeps|triceps|extension|seitheben|raise|fly|halo|wrist/.test(n)) return 0.5;
  if (/swing|squat|kniebeuge|deadlift|kreuzheben|clean|snatch|reißen|reissen|umsetzen|thruster|get.?up|ausfallschritt|lunge|step|hip/.test(n)) return 1.2;
  return 1;
}

// Bouldern nach Grad (Empfehlung 13): Punkte je Boulder steigen je Grad um etwa ein Viertel, ein Versuch zählt halb.
// 20 Tops im Grad 5 ergeben etwa so viel wie eine Stunde Bouldern mit Anstrengung 6.
export const GRADE_POINTS: Record<string, number> = { "4": 1, "4+": 1.3, "5": 1.7, "5+": 2.2, "6A": 2.8, "6A+": 3.5, "6B": 4.3 };
export function climbPoints(climbs: ClimbRow[], day: string): number {
  return climbs.filter((c) => c.day === day).reduce((s, c) => s + (GRADE_POINTS[c.grade] ?? 1.7) * (c.result === "versuch" ? 0.5 : 1), 0);
}
export type MuscleUnit = Activity & { rpe?: number | null };

// Startwerte (Konzept): Einheit = Minuten × Anstrengung ÷ 10, Karate zählt halb, ohne Anstrengung gilt 5.
// Kettlebell-Sätze ohne Einheit mit Anstrengung: Wiederholungen × kg × Übungsfaktor ÷ 40, Körpergewicht zählt wie 8 kg.
export const MUSCLE_SPORTS: Partial<Record<Sport, number>> = { kettlebell: 1, klettern: 1, karate: 0.5 };
export const DEFAULT_RPE = 5;
export const KG_PER_POINT = 40;
export const BODYWEIGHT_KG = 8;
export const DEFAULT_MIN = 60; // im Kalender abgehakt ohne Dauer: 60 Minuten

export type MuscleDay = { points: number; estimated: boolean }; // estimated: Anstrengung fehlte, mit 5 gerechnet

// done: im Kalender erfasste Einheiten. Sie zählen nur, wenn Garmin an dem Tag keine Einheit derselben Sportart hat.
export function musclePerDay(units: MuscleUnit[], sets: KbSet[], done: DoneSession[] = [], climbs: ClimbRow[] = []): { perDay: Map<string, number>; first: string | null; last: string | null; days: Map<string, MuscleDay> } {
  const days = new Map<string, MuscleDay>();
  const add = (d: string, p: number, est: boolean) => {
    const cur = days.get(d) ?? { points: 0, estimated: false };
    days.set(d, { points: cur.points + p, estimated: cur.estimated || est });
  };
  const kbWithRpe = new Set<string>();
  const climbDays = new Set<string>(); // Boulder-Grade je Tag nur einmal
  for (const u of units) {
    const d = (u.start_local ?? "").slice(0, 10);
    const w = MUSCLE_SPORTS[sportOf(u)];
    if (!d || !w || !u.duration_s) continue;
    const rpe = u.rpe ?? null;
    if (sportOf(u) === "kettlebell" && rpe !== null) kbWithRpe.add(d);
    // Kettlebell ohne Anstrengung, aber mit Sätzen: die Sätze zählen (unten), die Einheit nicht doppelt
    if (sportOf(u) === "kettlebell" && rpe === null && sets.some((s) => s.day === d)) continue;
    const byTime = ((u.duration_s / 60) * (rpe ?? DEFAULT_RPE) * w) / 10;
    // Bouldern: eingetragene Boulder nach Grad, wenn sie mehr ergeben als die Minuten
    const byGrade = sportOf(u) === "klettern" && !climbDays.has(d) ? climbPoints(climbs, d) : 0;
    if (byGrade) climbDays.add(d);
    add(d, Math.max(byTime, byGrade), rpe === null && byGrade < byTime);
  }
  for (const s of done) {
    const sport = s.sport as Sport;
    const w = MUSCLE_SPORTS[sport];
    if (!w) continue;
    if (units.some((u) => (u.start_local ?? "").slice(0, 10) === s.day && sportOf(u) === sport)) continue;
    const rpe = s.rpe ?? null;
    if (sport === "kettlebell" && rpe !== null) kbWithRpe.add(s.day);
    if (sport === "kettlebell" && rpe === null && sets.some((x) => x.day === s.day)) continue;
    add(s.day, ((s.duration_min ?? DEFAULT_MIN) * (rpe ?? DEFAULT_RPE) * w) / 10, rpe === null || s.duration_min == null);
  }
  const vol = new Map<string, number>();
  for (const s of sets) vol.set(s.day, (vol.get(s.day) ?? 0) + s.reps * (s.weight_kg || BODYWEIGHT_KG) * exerciseFactor(s.exercise));
  for (const [d, v] of vol) if (!kbWithRpe.has(d)) add(d, v / KG_PER_POINT, false);
  const perDay = new Map([...days].map(([d, m]) => [d, m.points]));
  const sorted = [...perDay.keys()].sort();
  return { perDay, first: sorted[0] ?? null, last: sorted[sorted.length - 1] ?? null, days };
}

// ---------- Texte

export function zustandSatz(z: Zustand | null, kind: "cardio" | "muskeln"): string {
  if (z === null) return kind === "cardio" ? "Noch keine Belastungsdaten." : "Noch keine Kraft-Einheiten eingetragen.";
  switch (z) {
    case "kalibrieren":
      return "Dein Bereich entsteht noch. Nach 5 Wochen mit Daten gibt es eine Einordnung.";
    case "abbau":
      return kind === "cardio" ? "Du liegst unter deinem Bereich. Deine Form baut gerade etwas ab." : "Du liegst unter deinem Bereich. Deine Muskeln bekommen gerade weniger Reiz als sonst.";
    case "optimal":
      return "Du bist im optimalen Bereich.";
    case "muede":
      return "Du bist im Bereich, aber müde. Steigere diese Woche nicht weiter.";
    case "steigt":
      return "Deine Belastung steigt schnell. Plane ein paar ruhigere Tage ein.";
  }
}

export function lastUnitText(last: string | null, today: string): string | null {
  if (!last) return null;
  const n = Math.round((new Date(today + "T12:00:00").getTime() - new Date(last + "T12:00:00").getTime()) / 864e5);
  return n <= 0 ? "Letzte Kraft-Einheit heute." : n === 1 ? "Letzte Kraft-Einheit gestern." : `Letzte Kraft-Einheit vor ${n} Tagen.`;
}

// Anteil der Tage je Zustand im Zeitraum
export function verteilung(pts: ZeitPunkt[]): { zustand: Zustand; tage: number; anteil: number }[] {
  const withZ = pts.filter((p) => p.zustand !== null);
  return ZUSTAND_REIHE.map((z) => {
    const tage = withZ.filter((p) => p.zustand === z).length;
    return { zustand: z, tage, anteil: withZ.length ? tage / withZ.length : 0 };
  }).filter((r) => r.tage > 0);
}
