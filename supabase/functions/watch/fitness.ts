// Health Coach · Eigenes Fitness-Alter
// Reine Rechnung ohne Netzwerk und ohne Importe: wird von der Uhr-Funktion (Deno) und von der App (lib/fitnessAge.ts) genutzt.
//
// 1. Fitness (VO2max, ml pro kg und Minute) schätzen mit dem Frauen-Modell der HUNT-Studie
//    (Nes et al. 2011, Med Sci Sports Exerc 43:2024–30):
//    74,736 − 0,247 × Alter − 0,259 × Bauchumfang (cm) − 0,114 × Ruhepuls + 0,198 × Aktivitätsindex
// 2. Fitness-Alter = das Alter, in dem Frauen im Schnitt genau diese Fitness haben
//    (HUNT3-Normwerte, NTNU CERG „Fitness numbers“), dazwischen gleitend.
//
// Annahme (mit der Nutzerin abgestimmt am 22.11.2026): Die Punktwerte des Aktivitätsindex aus Nes 2011 sind nicht
// veröffentlicht. Wir nutzen die ältere HUNT-Wertung (Häufigkeit 0–5 × Intensität 1–3 × Dauer 0,1–1, Bereich 0–15)
// und skalieren sie auf den Bereich 0–67,5, den Folgearbeiten für den Index von Nes nennen (Faktor 4,5).
// Damit landet eine durchschnittlich aktive Frau etwa beim HUNT-Mittel. Die Werte sind Schätzungen, keine Messung.

export const SEE = 5.14; // mittlerer Fehler der Formel für Frauen in ml/kg/min (Nes 2011)
export const PA_SCALE = 4.5;
const MIN_SESSION_MIN = 10;

// HUNT3-Normwerte Frauen, Mitte der Altersgruppe → VO2max
const NORM: [number, number][] = [
  [25, 43],
  [35, 40],
  [45, 38],
  [55, 34],
  [65, 31],
  [75, 27],
];

export type FitAct = { start_local: string | null; duration_s: number | null; avg_hr: number | null };
export type FitDay = { day: string; resting_hr: number | null };
export type FitIllness = { started_on: string; ended_on: string | null };

export type Activity4w = {
  sessions: number; // gezählte Einheiten in 4 Wochen
  perWeek: number;
  freqPts: number;
  intensityPts: number;
  durationPts: number;
  index: number; // 0–67,5
};

export type FitnessResult = {
  age: number;
  vo2: number;
  fitnessAge: number;
  low: number; // Spanne aus dem Formelfehler
  high: number;
  rhr: number;
  waist: number;
  activity: Activity4w;
  levers: { label: string; years: number }[];
};

const DAY_MS = 864e5;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Maximalpuls nach HUNT (Nes et al. 2013): 211 − 0,64 × Alter
export const hrMax = (age: number) => 211 - 0.64 * age;

const freqPoints = (perWeek: number) => (perWeek < 1 ? 0 : perWeek < 2 ? 1 : perWeek < 4 ? 2.5 : 5);
const durPoints = (min: number) => (min < 15 ? 0.1 : min < 30 ? 0.38 : min <= 60 ? 0.75 : 1);

// Intensität einer Einheit aus dem Durchschnittspuls: unter 64 % des Maximalpulses = "ohne Schwitzen" (zählt laut HUNT nicht),
// bis 80 % = "außer Atem und schwitzen", ab 80 % = "bis an die Grenze"
function intensity(avgHr: number | null, age: number): number {
  if (avgHr === null || avgHr <= 0) return 2; // ohne Puls: mittlere Stufe annehmen
  const p = avgHr / hrMax(age);
  return p < 0.64 ? 1 : p < 0.8 ? 2 : 3;
}

// Aktivitätsindex aus den Garmin-Aktivitäten der 28 Tage bis einschließlich `day`
export function activityIndex(acts: FitAct[], day: string, age: number): Activity4w {
  const from = addDays(day, -27);
  const counted: { min: number; pts: number }[] = [];
  for (const a of acts) {
    const d = (a.start_local ?? "").slice(0, 10);
    if (!d || d < from || d > day) continue;
    const min = (a.duration_s ?? 0) / 60;
    if (min < MIN_SESSION_MIN) continue;
    const pts = intensity(a.avg_hr, age);
    if (pts === 1) continue; // leichte Bewegung zählt im HUNT-Index nicht
    counted.push({ min, pts });
  }
  const perWeek = counted.length / 4;
  const freqPts = freqPoints(perWeek);
  const intensityPts = counted.length ? counted.reduce((s, c) => s + c.pts, 0) / counted.length : 0;
  const durationPts = counted.length ? durPoints(median(counted.map((c) => c.min)) ?? 0) : 0;
  const index = freqPts * intensityPts * durationPts * PA_SCALE;
  return { sessions: counted.length, perWeek, freqPts, intensityPts, durationPts, index };
}

// Ruhepuls: Median der 28 Tage bis `day`, ohne Tage mit eingetragener Krankheit.
// 28 Tage decken einen ganzen Zyklus ab; der höhere Ruhepuls in der Lutealphase verzerrt so nicht.
export function restingHr(days: FitDay[], ill: FitIllness[], day: string): number | null {
  const from = addDays(day, -27);
  const sick = (d: string) => ill.some((i) => d >= i.started_on && d <= (i.ended_on ?? day));
  const vals = days.filter((r) => r.day >= from && r.day <= day && r.resting_hr !== null && !sick(r.day)).map((r) => r.resting_hr as number);
  return vals.length >= 7 ? median(vals) : null;
}

export function vo2Estimate(age: number, waist: number, rhr: number, paIndex: number): number {
  return 74.736 - 0.247 * age - 0.259 * waist - 0.114 * rhr + 0.198 * paIndex;
}

// Alter, in dem Frauen im Schnitt diese Fitness haben; Grenzen 20 und 80 Jahre
export function ageForVo2(vo2: number): number {
  let age: number;
  if (vo2 >= NORM[0][1]) {
    const slope = (NORM[1][0] - NORM[0][0]) / (NORM[0][1] - NORM[1][1]); // Jahre pro ml
    age = NORM[0][0] - (vo2 - NORM[0][1]) * slope;
  } else if (vo2 <= NORM[NORM.length - 1][1]) {
    const a = NORM[NORM.length - 2];
    const b = NORM[NORM.length - 1];
    age = b[0] + (b[1] - vo2) * ((b[0] - a[0]) / (a[1] - b[1]));
  } else {
    age = NORM[0][0];
    for (let i = 1; i < NORM.length; i++) {
      const [a0, v0] = NORM[i - 1];
      const [a1, v1] = NORM[i];
      if (vo2 <= v0 && vo2 >= v1) {
        age = a0 + ((v0 - vo2) / (v0 - v1)) * (a1 - a0);
        break;
      }
    }
  }
  return Math.max(20, Math.min(80, age));
}

export function ageOn(birthYear: number, day: string): number {
  return Number(day.slice(0, 4)) - birthYear;
}

// Gesamtrechnung für einen Tag. null, wenn Alter, Bauchumfang oder genug Ruhepuls-Tage fehlen.
export function fitnessAge(input: { birthYear: number | null; waist: number | null; days: FitDay[]; acts: FitAct[]; ill: FitIllness[]; day: string }): FitnessResult | null {
  const { birthYear, waist, days, acts, ill, day } = input;
  if (!birthYear || !waist) return null;
  const age = ageOn(birthYear, day);
  const rhr = restingHr(days, ill, day);
  if (rhr === null) return null;
  const activity = activityIndex(acts, day, age);
  const vo2 = vo2Estimate(age, waist, rhr, activity.index);
  const fa = ageForVo2(vo2);

  // Hebel: was würde das Fitness-Alter senken? (Bauchumfang bewusst ohne Zielvorgabe)
  const levers: { label: string; years: number }[] = [];
  const yearsFor = (dv: number) => Math.round((fa - ageForVo2(vo2 + dv)) * 10) / 10;
  levers.push({ label: "Ruhepuls 5 Schläge niedriger", years: yearsFor(0.114 * 5) });
  const nextFreq = activity.freqPts < 1 ? 1 : activity.freqPts < 2.5 ? 2.5 : activity.freqPts < 5 ? 5 : null;
  const iPts = activity.intensityPts || 2;
  const dPts = activity.durationPts || 0.75;
  if (nextFreq !== null) {
    const idx = nextFreq * iPts * dPts * PA_SCALE;
    levers.push({ label: activity.freqPts < 2.5 ? "Eine Einheit mehr pro Woche" : "Vier und mehr Einheiten pro Woche", years: yearsFor(0.198 * (idx - activity.index)) });
  }
  if (activity.intensityPts > 0 && activity.intensityPts < 3) {
    const idx = activity.freqPts * Math.min(3, activity.intensityPts + 0.5) * dPts * PA_SCALE;
    levers.push({ label: "Etwa jede zweite Einheit härter (ab 80 % Maximalpuls)", years: yearsFor(0.198 * (idx - activity.index)) });
  }

  return {
    age,
    vo2,
    fitnessAge: Math.round(fa),
    low: Math.round(ageForVo2(vo2 + SEE)),
    high: Math.round(ageForVo2(vo2 - SEE)),
    rhr,
    waist,
    activity,
    levers: levers.filter((l) => l.years > 0),
  };
}

// Letzter Bauchumfang bis `day` (höchstens 180 Tage alt)
export function waistOn(rows: { day: string; waist_cm: number | null }[], day: string): { value: number; day: string } | null {
  const from = addDays(day, -179);
  const sel = rows.filter((r) => r.waist_cm !== null && r.day <= day && r.day >= from).sort((a, b) => a.day.localeCompare(b.day));
  const last = sel[sel.length - 1];
  return last ? { value: Number(last.waist_cm), day: last.day } : null;
}

export const daysSince = (from: string, to: string) => Math.round((new Date(to + "T12:00:00Z").getTime() - new Date(from + "T12:00:00Z").getTime()) / DAY_MS);
