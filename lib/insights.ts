// Tagesziel und Muster: reine Berechnungen aus den Daten, ohne Netzwerk.
// Alles vorsichtig formuliert: Zusammenhänge, keine Beweise, keine Diagnosen.

import type { Activity, Daily } from "@/lib/garmin";
import { INFLUENCES } from "@/lib/catalog";
import { illnessRule, type Illness } from "@/lib/health";
import { sportOf, type Sport } from "@/lib/training";
import { alltagMinutes, FULL_DAY_LOAD, loadToPct, readLoadDay } from "@/lib/alltagslast";
import { baselineFor, RANGE_PHASE_NAMES, type Baseline, type Range } from "@/lib/baseline";
import { sleepScore } from "@/lib/schlaf";
import { sleepScores } from "@/lib/schlaf";

export type Diary = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[]; fromGarmin?: boolean; garminOnly?: boolean; ovulation?: string[]; symptoms_checked?: boolean };
// fromGarmin: Blutung an diesem Tag stammt aus Garmin · garminOnly: kein eigener Tagebucheintrag an diesem Tag
// (Periode aus Garmin oder nur Sport/Stress von garmin-sync, Spalte manual = false)
export type Checkin = { day: string; energy: number | null; sleep: number | null; mood: number | null };
export type Hub = { day: string };

export type Data = {
  daily: Daily[];
  acts: Activity[];
  diary: Diary[];
  checkins: Checkin[];
  hubs: Hub[]; // Bedarfs-Einnahmen
  illness: Illness | null;
  sick?: Set<string>; // Krankheitstage und 3 Tage danach: zählen nicht zum persönlichen Bereich
  done?: DoneSession[]; // im Kalender erfasste oder abgehakte Einheiten (planned_sessions, Status erledigt)
};
export type DoneSession = { day: string; sport: string; duration_min?: number | null; rpe?: number | null };

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v: number[]) => {
  const m = mean(v);
  return m === null || v.length < 2 ? null : Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

// ---------- Belastung

// Skala (abflachend, 150 Last = 100 %): loadToPct in lib/alltagslast.ts
export { FULL_DAY_LOAD, loadToPct };
export const HARD_DAY_PCT = Math.round(loadToPct(105)); // harter Tag ab 105 Last (früher 70 % der geraden Skala) = 78 %
export const MID_DAY_PCT = Math.round(loadToPct(60)); // mittlerer Tag ab 60 Last (früher 40 %) = 51 %

export type DayLoad = {
  training: number; // Garmin-Last der Trainings
  alltag: number; // Alltag in derselben Einheit (0 ohne Daten)
  pct: number; // Belastung gesamt in %, 150 Last = 100 %, kann darüber liegen
  pctTraining: number; // davon Training
  pctAlltag: number; // davon Alltag
  quelle: "puls" | "schritte" | null; // null: Tag ohne Alltagsdaten (alte Berechnung)
  alltagMin: number | null; // Minuten in Bewegung im Alltag
  steps: number | null; // Schritte außerhalb von Trainings
};

// Belastung eines Tages aus Training und Alltag (Konzept Korridore und Alltagslast, Teil B).
// Gibt es für den Tag keine Alltagsdaten, zählen 60 Intensitätsminuten wie 150 Trainingslast.
// Die Prozente kommen aus der Gesamtlast (abflachende Skala), Training und Alltag teilen sie nach ihrem Anteil an der Last.
export function dayLoad(day: string, daily: Daily[], acts: Activity[]): DayLoad {
  const d = daily.find((r) => r.day === day);
  const tl = acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day).reduce((s, a) => s + actLoad(a), 0);
  const ld = readLoadDay(d?.load_daily_min);
  if (!ld) {
    const im = d?.intensity_minutes ?? 0;
    const pct = Math.round(loadToPct(Math.max((im / 60) * FULL_DAY_LOAD, tl)));
    return { training: tl, alltag: 0, pct, pctTraining: pct, pctAlltag: 0, quelle: null, alltagMin: null, steps: d?.steps_outside_acts ?? null };
  }
  const training = tl || ld.last_training || 0;
  const alltag = Math.max(0, ld.last_alltag ?? 0);
  const total = training + alltag;
  const pct = Math.round(loadToPct(total));
  const pctTraining = total > 0 ? Math.round((pct * training) / total) : 0;
  return { training, alltag, pct, pctTraining, pctAlltag: pct - pctTraining, quelle: ld.quelle, alltagMin: alltagMinutes(ld), steps: d?.steps_outside_acts ?? null };
}

// Last einer Einheit. Bei Kraft (Kettlebell, Bouldern, Karate) unterschätzt der Puls die Arbeit der Muskeln (Whoop: Strength Trainer).
// Mit eingetragener Anstrengung zählt deshalb mindestens die Muskelrechnung: Minuten × Anstrengung ÷ 10 × Sportgewicht × 2
// (Prüfaudit 26.11., Empfehlung 16). Das Höhere zählt, nicht die Summe, damit nichts doppelt zählt.
export const MUSCLE_LOAD_PER_POINT = 2;
const STRENGTH_WEIGHT: Partial<Record<Sport, number>> = { kettlebell: 1, klettern: 1, karate: 0.5 };
export function actLoad(a: Activity & { rpe?: number | null }): number {
  const hr = a.training_load ?? 0;
  const w = STRENGTH_WEIGHT[sportOf(a)];
  if (!w || a.rpe == null || !a.duration_s) return hr;
  return Math.max(hr, ((a.duration_s / 60) * a.rpe * w * MUSCLE_LOAD_PER_POINT) / 10);
}

// Zahl für Ring und Bogen: kleine Belastung, die auf 0 % gerundet wäre, heißt „unter 1 %“
export function loadLabel(dl: DayLoad): string {
  return dl.pct === 0 && dl.training + dl.alltag > 0 ? "unter 1 %" : `${dl.pct} %`;
}

// Anteil Training am gezeichneten Ring (0–1): Über 100 % ist der Ring voll, Training und Alltag teilen ihn nach ihrem Anteil
export function ringSplit(dl: DayLoad): number | null {
  if (!dl.quelle) return null;
  return dl.pct > 0 ? (Math.min(1, dl.pct / 100) * dl.pctTraining) / dl.pct : 0;
}

export function loadPercent(day: string, daily: Daily[], acts: Activity[]): number {
  return dayLoad(day, daily, acts).pct;
}

// Erster Tag mit Alltagsdaten (für den einmaligen Hinweis, dass Werte jetzt höher liegen)
export function firstAlltagDay(daily: Daily[]): string | null {
  return daily.filter((d) => readLoadDay(d.load_daily_min)).map((d) => d.day).sort()[0] ?? null;
}

// ---------- Zyklus

export function periodStarts(diary: Diary[]): string[] {
  const bleed = new Set(diary.filter((d) => d.bleeding >= 2).map((d) => d.day));
  const any = new Set(diary.filter((d) => d.bleeding >= 1).map((d) => d.day));
  // Beginn: Tag mit mindestens leichter Blutung, an den zwei Tagen davor keine Blutung
  return [...bleed].filter((d) => !any.has(addDays(d, -1)) && !any.has(addDays(d, -2))).sort();
}

export function cycleInfo(day: string, diary: Diary[]): { cycleDay: number | null; length: number; beforePeriod: boolean; cycles: number; fromGarmin: boolean } {
  const starts = periodStarts(diary).filter((s) => s <= day);
  const lens: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const l = Math.round((new Date(starts[i]).getTime() - new Date(starts[i - 1]).getTime()) / 864e5);
    if (l >= 15 && l <= 60) lens.push(l);
  }
  const length = Math.round(mean(lens) ?? 28);
  const last = starts[starts.length - 1];
  if (!last) return { cycleDay: null, length, beforePeriod: false, cycles: lens.length, fromGarmin: false };
  const cycleDay = Math.round((new Date(day).getTime() - new Date(last).getTime()) / 864e5) + 1;
  const fromGarmin = !!diary.find((d) => d.day === last)?.fromGarmin;
  return { cycleDay, length, beforePeriod: cycleDay > length - 5 && cycleDay <= length + 3, cycles: lens.length, fromGarmin };
}

// ---------- Tagesziel

export type Factor = { name: string; value: string; note: string; effect: number };
export type Target = {
  score: number;
  label: string;
  lo: number;
  hi: number;
  factors: Factor[];
  pause: boolean;
  enoughData: boolean;
  usual: number | null; // übliche Tagesbelastung in % (Schnitt der letzten 28 Tage), null: Ziel aus festen Stufen
  brake: boolean; // Last der letzten 7 Tage über 130 % der 4 Wochen davor: Ziel nicht über der üblichen Belastung
  infection: boolean; // Infektverdacht: Readiness zeigt „Erholen“, Ziel wie bei Erholung
  missing: boolean; // weder HRV noch Ruhepuls noch Schlaf: keine Zahl, „Daten fehlen“
};

// ---------- Infektverdacht (Prüfaudit 26.11., Empfehlung 3)
// Ruhepuls mindestens 4 Schläge über dem Üblichen und dazu ein zweites Zeichen: HRV unter oder Atemfrequenz über deinem Bereich.
// Ist die HRV um mindestens 20 % unter dem Bereich, genügen 3 Schläge (echte Daten 27.11.: vor einem Infekt lag der Ruhepuls nur um 3,5 über dem Üblichen, die HRV 35 % unter dem Bereich).
// Maßstab ist der Bereich der heutigen Zyklusphase (sonst 30 Tage), damit der höhere Ruhepuls der Lutealphase keinen Fehlalarm auslöst.
export const INFECTION_RHR = 4;
export const INFECTION_RHR_HRV = 3;
export const INFECTION_HRV_DROP = 0.2;
export function infectionSigns(day: string, data: Data): boolean {
  const today = data.daily.find((r) => r.day === day);
  if (!today || today.resting_hr === null) return false;
  const ctx = { diary: data.diary, sick: data.sick };
  const b = (f: (r: Daily) => number | null) => baselineFor(data.daily.map((r) => ({ day: r.day, value: f(r) })), day, ctx, true).active;
  const rh = b((r) => r.resting_hr);
  if (!rh || rh.n < 7 || today.resting_hr < rh.median + INFECTION_RHR_HRV) return false;
  const over = today.resting_hr - rh.median;
  const hv = today.hrv_last_night !== null ? b((r) => r.hrv_last_night) : null;
  const hrvLow = !!hv && hv.n >= 7 && (today.hrv_last_night as number) < hv.lo;
  const hrvFar = !!hv && hv.n >= 7 && (today.hrv_last_night as number) <= hv.lo * (1 - INFECTION_HRV_DROP);
  if (over < INFECTION_RHR) return hrvFar;
  const atem = typeof today.respiration_avg === "number" ? today.respiration_avg : null;
  const at = atem !== null ? b((r) => (typeof r.respiration_avg === "number" ? r.respiration_avg : null)) : null;
  const atemHigh = !!at && at.n >= 7 && (atem as number) > at.hi;
  return hrvLow || atemHigh;
}

// Belastung der letzten Tage (Prüfaudit 26.11., Empfehlung 1, nach Garmins akuter Belastung).
// Maßstab ist ein üblicher Trainingstag: das obere Viertel deiner Tage der letzten 28 Tage (ohne kranke Tage).
// Gestern ab dem 1,3-Fachen −5, ab dem 1,6-Fachen −10. Zwei Tage in Folge auf Trainingstag-Niveau: −5.
// Unter 14 Tagen mit Daten: gestern ein harter Tag −5.
function recentLoadFactor(day: string, data: Data): Factor | null {
  const has = new Set(data.daily.map((r) => r.day));
  const actDays = new Set(data.acts.map((a) => (a.start_local ?? "").slice(0, 10)));
  const pct = (d: string) => (has.has(d) || actDays.has(d) ? dayLoad(d, data.daily, data.acts).pct : null);
  const y = pct(addDays(day, -1));
  if (y === null) return null;
  const v = pct(addDays(day, -2)) ?? 0;
  const hist: number[] = [];
  for (let i = 1; i <= TARGET_DAYS; i++) {
    const d = addDays(day, -i);
    const p = data.sick?.has(d) ? null : pct(d);
    if (p !== null) hist.push(p);
  }
  if (hist.length < TARGET_MIN_DAYS) return y >= HARD_DAY_PCT ? { name: "Belastung gestern", value: `${y} %`, note: "harter Tag", effect: -5 } : null;
  const sorted = [...hist].sort((a, b) => a - b);
  const ref = Math.max(sorted[Math.floor(0.75 * (sorted.length - 1))], MID_DAY_PCT);
  const effect = y >= 1.6 * ref ? -10 : y >= 1.3 * ref ? -5 : y >= ref && v >= ref ? -5 : 0;
  const note = effect === 0 ? `im Rahmen (üblicher Trainingstag ${Math.round(ref)} %)` : y >= 1.3 * ref ? `deutlich über einem üblichen Trainingstag (${Math.round(ref)} %)` : "zwei Trainingstage in Folge";
  return { name: "Belastung gestern", value: `${y} %`, note, effect };
}

// Persönliches Belastungsziel (Konzept docs/konzept-belastung-skala.md, Nutzerin 24.11.)
export const TARGET_DAYS = 28; // übliche Belastung: Schnitt der letzten 28 Tage ohne heute und ohne kranke Tage
export const TARGET_MIN_DAYS = 14; // darunter gelten die festen Stufen
export const TARGET_HALF = 10; // Zielbereich: Mitte ± 10 Prozentpunkte
export const TARGET_BRAKE = 1.3; // Bremse ab diesem Verhältnis 7 Tage zu den 4 Wochen davor
// Gleitend statt in Stufen, damit ein Punkt mehr das Ziel nicht springen lässt (Prüfaudit 26.11., Empfehlung 7).
// Stützpunkte: bis 30 → 0,5 · 50 → 0,75 · 75 (Startwert, normaler Tag) → 1,0 · ab 92 → 1,15, dazwischen linear.
export const READINESS_START = 75; // Startwert ohne Zu- und Abschläge (Prüfaudit 26.11., Empfehlung 17: Skala gestreckt)
const FACTOR_POINTS: [number, number][] = [[30, 0.5], [50, 0.75], [75, 1], [92, 1.15]];
export function readinessFactor(score: number): number {
  const p = FACTOR_POINTS;
  if (score <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (score <= p[i][0]) return p[i - 1][1] + ((score - p[i - 1][0]) / (p[i][0] - p[i - 1][0])) * (p[i][1] - p[i - 1][1]);
  }
  return p[p.length - 1][1];
}

// Übliche Belastung und Bremse für das Ziel an `day`
export function usualLoad(day: string, data: Data): { usual: number | null; brake: boolean } {
  const has = new Set(data.daily.map((r) => r.day));
  const pcts: number[] = [];
  const raw: number[] = []; // Last je Tag, Tag 1 = gestern
  for (let i = 1; i <= TARGET_DAYS; i++) {
    const d = addDays(day, -i);
    const dl = has.has(d) ? dayLoad(d, data.daily, data.acts) : null;
    raw.push(dl ? dl.training + dl.alltag : 0);
    if (dl && !data.sick?.has(d)) pcts.push(dl.pct);
  }
  if (pcts.length < TARGET_MIN_DAYS) return { usual: null, brake: false };
  const acute = raw.slice(0, 7).reduce((a, b) => a + b, 0);
  const chronic = raw.reduce((a, b) => a + b, 0) / 4;
  return { usual: mean(pcts), brake: chronic > 0 && acute / chronic > TARGET_BRAKE };
}

// Zielbereich aus Readiness und üblicher Belastung, Grenzen 10 bis 140 %
export function targetBand(score: number, usual: number, brake: boolean): { lo: number; hi: number } {
  let mid = usual * readinessFactor(score);
  if (brake) mid = Math.min(mid, usual);
  const lo = Math.max(10, Math.round(mid - TARGET_HALF));
  const hi = Math.min(140, Math.max(lo + 2 * TARGET_HALF, Math.round(mid + TARGET_HALF)));
  return { lo: Math.min(lo, hi - 2 * TARGET_HALF), hi };
}

const BANDS = [
  { min: 82, label: "Hart möglich", lo: 65, hi: 85 },
  { min: 62, label: "Moderat", lo: 45, hi: 65 },
  { min: 42, label: "Leicht", lo: 25, hi: 45 },
  { min: -999, label: "Erholung", lo: 10, hi: 25 },
];

// Ein Faktor der Readiness: heutiger Wert gegen den persönlichen Bereich (30 Tage ohne heute, mittlere Hälfte, ab 14 Tagen).
// In der Lutealphase gilt für HRV und Ruhepuls der Luteal-Bereich (lib/baseline.ts).
// Abstand außerhalb des Bereichs in Bereichsbreiten: ab 0,6 voller Abzug, darunter halber Abzug, deutlich besser ein halber Bonus.
function rangeFactor(name: string, v: number | null, range: Range | null, phaseName: string | null, fmt: (x: number) => string, higherIsBetter: boolean, weight: number, unit = ""): Factor | null {
  if (v === null) return null;
  if (!range) return { name, value: fmt(v) + unit, note: "Dein Bereich entsteht ab 7 Tagen", effect: 0 };
  if (!range.stable) return { name, value: fmt(v) + unit, note: `Dein Bereich ist noch vorläufig (${range.n} Tage), er zählt ab 14 Tagen`, effect: 0 };
  const width = range.hi - range.lo || Math.max(1, Math.abs(range.median) * 0.05);
  const below = v < range.lo ? (range.lo - v) / width : 0;
  const above = v > range.hi ? (v - range.hi) / width : 0;
  const bad = higherIsBetter ? below - above : above - below; // > 0: auf der ungünstigen Seite
  let effect = 0;
  if (bad > 0.6) effect = -weight;
  else if (bad > 0) effect = -Math.round(weight / 2);
  else if (bad < -0.5) effect = Math.round(weight / 2); // deutlich besser: halbes Gewicht als Bonus (Empfehlung 17)
  const where = `${phaseName ? `Bereich ${phaseName}` : "dein Bereich"} ${fmt(range.lo)}–${fmt(range.hi)}${unit}`;
  const note = !below && !above ? `im Bereich (${where})` : `${above ? "über" : "unter"} dem Bereich (${where})`;
  return { name, value: fmt(v) + unit, note, effect };
}

// HRV für die Readiness: halb letzte Nacht, halb der Schnitt der letzten 7 Nächte (ab 3 Werten), sonst nur letzte Nacht
export function hrvBlend(day: string, data: Data): number | null {
  const byDay = new Map(data.daily.map((r) => [r.day, r.hrv_last_night]));
  const last = byDay.get(day) ?? null;
  if (last === null) return null;
  const week = Array.from({ length: 7 }, (_, i) => byDay.get(addDays(day, -i)) ?? null).filter((v): v is number => v !== null);
  return week.length >= 3 ? 0.5 * last + 0.5 * (mean(week) as number) : last;
}

// Stress der letzten 3 Tage gegen deinen Bereich (Empfehlung 10, wie Garmins Stresshistorie). Über dem Bereich −3, deutlich darüber −6.
function stressFactor(day: string, data: Data): Factor | null {
  const vals = [1, 2, 3].map((i) => data.daily.find((r) => r.day === addDays(day, -i))?.stress_avg ?? null).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const v = mean(vals) as number;
  const b = baselineFor(data.daily.map((r) => ({ day: r.day, value: r.stress_avg })), addDays(day, -3), { diary: data.diary, sick: data.sick }, false).active;
  if (!b?.stable) return null;
  const width = Math.max(b.hi - b.lo, 3);
  const over = (v - b.hi) / width;
  const effect = over > 0.6 ? -6 : over > 0 ? -3 : 0;
  return { name: "Stress 3 Tage", value: String(Math.round(v)), note: effect ? `über deinem Bereich (${Math.round(b.lo)}–${Math.round(b.hi)})` : `im Bereich (${Math.round(b.lo)}–${Math.round(b.hi)})`, effect };
}

// Schlaf auf die Readiness: ab 85 +5, ab 70 ±0, ab 55 −5, darunter gleitend bis −15 bei 40 Punkten (Empfehlung 6)
export function sleepEffect(total: number): number {
  if (total >= 85) return 5;
  if (total >= 70) return 0;
  if (total >= 55) return -5;
  return -Math.min(15, 5 + Math.round(((55 - total) * 10) / 15));
}

export function computeTarget(day: string, data: Data): Target {
  const factors: Factor[] = [];
  const hist = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -30));
  const today = data.daily.find((r) => r.day === day) ?? null;
  const num = (f: (r: Daily) => number | null) => hist.map(f).filter((v): v is number => v !== null);

  const push = (f: Factor | null) => f && factors.push(f);
  const base = (f: (r: Daily) => number | null, cycleSensitive: boolean) => baselineFor(data.daily.map((r) => ({ day: r.day, value: f(r) })), day, { diary: data.diary, sick: data.sick }, cycleSensitive);
  const phaseName = (b: Baseline) => (b.phase && b.phaseKey ? RANGE_PHASE_NAMES[b.phaseKey] : null);
  const r0 = (x: number) => String(Math.round(x));
  const hv = base((r) => r.hrv_last_night, true);
  const rh = base((r) => r.resting_hr, true);
  // Schlaf: eigener Gesamtwert aus Menge und Erholsam (lib/schlaf.ts), feste Stufen statt Bereich
  const sl = sleepScore(day, data);
  if (sl.total !== null) factors.push({ name: "Schlaf", value: `${sl.total} Punkte`, note: sl.word ?? "", effect: sleepEffect(sl.total) });
  // HRV: Mittel aus letzter Nacht und dem Schnitt der letzten 7 Nächte, damit eine einzelne unruhige Nacht weniger kippt (Empfehlung 8, wie Garmins HRV-Status)
  push(rangeFactor("HRV", hrvBlend(day, data), hv.active, phaseName(hv), r0, true, 15, " ms"));
  push(rangeFactor("Ruhepuls", today?.resting_hr ?? null, rh.active, phaseName(rh), r0, false, 8, " bpm"));
  push(stressFactor(day, data));
  if (today?.bb_max !== null && today?.bb_max !== undefined) {
    const bb = today.bb_max;
    factors.push({ name: "Body Battery", value: String(bb), note: bb < 30 ? "sehr niedrig" : bb < 50 ? "niedrig" : bb >= 75 ? "gut aufgeladen" : "mittel", effect: bb < 30 ? -8 : bb < 50 ? -4 : bb >= 75 ? 2 : 0 }); // halbes Gewicht: Body Battery enthält HRV, Stress und Schlaf schon (Empfehlung 9)
  }

  const ci = data.checkins.find((c) => c.day === day);
  if (ci) {
    const vals = [ci.energy, ci.sleep, ci.mood].filter((v): v is number => v !== null);
    const avg = mean(vals);
    if (avg !== null) factors.push({ name: "Check-in", value: avg < 1.7 ? "niedrig" : avg < 2.4 ? "mittel" : "gut", note: "Dein eigenes Gefühl heute Morgen", effect: avg < 1.7 ? -10 : avg < 2.4 ? -3 : 3 });
  }

  const sb = symptomBasis(data.diary, day);
  if (sb) {
    const strong = Object.values(sb.symptoms).filter((v) => v >= 3).length;
    const mid = Object.values(sb.symptoms).filter((v) => v === 2).length;
    const night = sb.symptoms.nacht ?? 0;
    const eff = -Math.round(Math.min(12, strong * 4 + mid * 2 + (night >= 2 ? 3 : 0)) * sb.weight);
    if (eff < 0) factors.push({ name: "Symptome", value: strong ? `${strong} stark` : `${mid} mittel`, note: sb.day === day ? "aus dem Tagebuch von heute" : "von gestern, im Check-in noch nicht bestätigt, zählt halb", effect: eff });
  }

  const cyc = cycleInfo(day, data.diary);
  if (cyc.cycleDay !== null) {
    const p = cyclePattern(data);
    // Wird die HRV heute schon am Bereich der Zyklusphase gemessen, steckt die Phase bereits darin: kein zweiter Abzug (Empfehlung 2)
    const phaseInHrv = !!hv.phase && hv.active === hv.phase;
    const lowBefore = p.ready && p.beforeDiff !== null && p.beforeDiff < -5 && !phaseInHrv;
    factors.push({
      name: `Zyklustag ${cyc.cycleDay}`,
      value: cyc.beforePeriod ? "vor der Periode" : cyc.cycleDay <= 5 ? "Periode" : "",
      note: cyc.beforePeriod && lowBefore ? "Deine HRV ist in diesen Tagen meist niedriger" : cyc.beforePeriod && phaseInHrv ? "Kein Abzug, HRV und Ruhepuls werden schon an dieser Phase gemessen" : "Kein Abzug, deine Daten zeigen hier keinen Unterschied",
      effect: cyc.beforePeriod && lowBefore ? -5 : 0,
    });
  }

  const pause = !!data.illness && illnessRule(data.illness).stop;
  if (data.illness) factors.push({ name: data.illness.label, value: `Stärke ${data.illness.severity}`, note: pause ? "Pause statt Training" : "Nur leichte Bewegung", effect: pause ? -100 : -25 });

  const { usual, brake } = usualLoad(day, data);
  push(recentLoadFactor(day, data));

  const infection = !pause && infectionSigns(day, data);
  if (infection) factors.push({ name: "Infektverdacht", value: "Ruhepuls deutlich höher", note: "Schongang statt Training", effect: -15 });

  const enoughData = hist.length >= 14; // ab 14 Tagen gibt es persönliche Bereiche
  // Ohne HRV, Ruhepuls und Schlaf keine Zahl (Empfehlung 5): sonst stünde ohne Daten der Startwert 80 als „Bereit“ da
  const missing = today?.hrv_last_night == null && today?.resting_hr == null && sl.total === null;
  const score = Math.max(0, Math.min(100, READINESS_START + factors.reduce((s, f) => s + f.effect, 0)));
  const common = { factors, pause, enoughData, infection, missing };
  if (pause) return { score: 0, label: "Pause", lo: 0, hi: 15, ...common, usual: null, brake: false };
  const band = BANDS.find((b) => score >= b.min)!;
  if (infection) return { score, label: "Erholung", lo: 10, hi: 25, ...common, usual: usual === null ? null : Math.round(usual), brake };
  if (usual === null) return { score, label: band.label, lo: band.lo, hi: band.hi, ...common, usual, brake };
  return { score, label: band.label, ...targetBand(score, usual, brake), ...common, usual: Math.round(usual), brake };
}

export function sportAdvice(t: Target, injuredSports: string[]): { sport: string; tip: string }[] {
  if (t.pause) return [{ sport: "Heute", tip: "Pause, Erholung geht vor" }];
  const hard = t.hi >= 85;
  const easy = t.hi <= 45;
  const climb = injuredSports.includes("klettern") ? "Pause wegen Verletzung" : hard ? "Projekt probieren" : easy ? "weit unter Projekt, Technik" : "1–2 Grade unter Projekt";
  return [
    { sport: "Bouldern", tip: climb },
    { sport: "Kettlebell", tip: hard ? "wie geplant" : easy ? "leichtere Kettlebell, Technik" : "wie geplant, ohne Zusatzsätze" },
    { sport: "Karate", tip: hard ? "Kumite möglich" : easy ? "Kata und Kihon locker" : "Kata statt hartes Kumite" },
    { sport: "Ausdauer", tip: hard ? "Intervalle möglich" : easy ? "locker gehen" : "ruhiges Tempo" },
  ];
}

// ---------- Muster

export type Pattern = { key: string; title: string; ready: boolean; need: string; text: string; bars: { label: string; value: number; display: string; highlight?: boolean }[]; basis: string };

const dailyMap = (data: Data) => new Map(data.daily.map((r) => [r.day, r]));

// HRV vor der Periode gegen den Rest des Zyklus
export function cyclePattern(data: Data): { ready: boolean; beforeDiff: number | null; phases: { label: string; hrv: number | null; rhr: number | null; n: number }[]; cycles: number } {
  const dm = dailyMap(data);
  const starts = periodStarts(data.diary);
  const phases = [
    { label: "Periode", from: 1, to: 5 },
    { label: "Tag 6–13", from: 6, to: 13 },
    { label: "Tag 14–20", from: 14, to: 20 },
    { label: "vor der Periode", from: -5, to: -1 },
  ];
  const buckets = phases.map(() => ({ hrv: [] as number[], rhr: [] as number[] }));
  let cycles = 0;
  for (let i = 0; i < starts.length - 1; i++) {
    const len = Math.round((new Date(starts[i + 1]).getTime() - new Date(starts[i]).getTime()) / 864e5);
    if (len < 15 || len > 60) continue;
    cycles++;
    for (let d = 1; d <= len; d++) {
      const day = addDays(starts[i], d - 1);
      const r = dm.get(day);
      if (!r) continue;
      const fromEnd = d - len - 1; // -1 = letzter Tag vor der nächsten Periode
      phases.forEach((p, idx) => {
        const hit = p.from > 0 ? d >= p.from && d <= p.to && fromEnd < -5 : fromEnd >= p.from && fromEnd <= p.to;
        if (hit) {
          if (r.hrv_last_night !== null) buckets[idx].hrv.push(r.hrv_last_night);
          if (r.resting_hr !== null) buckets[idx].rhr.push(r.resting_hr);
        }
      });
    }
  }
  const out = phases.map((p, i) => ({ label: p.label, hrv: mean(buckets[i].hrv), rhr: mean(buckets[i].rhr), n: buckets[i].hrv.length }));
  const before = out[3].hrv;
  const rest = mean([...buckets[0].hrv, ...buckets[1].hrv, ...buckets[2].hrv]);
  const ready = cycles >= 2 && out.every((o) => o.n >= 3);
  return { ready, beforeDiff: before !== null && rest ? ((before - rest) / rest) * 100 : null, phases: out, cycles };
}

export function patterns(data: Data): Pattern[] {
  const out: Pattern[] = [];
  const dm = dailyMap(data);
  const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

  // 1. Zyklus und HRV
  const cp = cyclePattern(data);
  out.push({
    key: "zyklus",
    title: "HRV im Zyklus",
    ready: cp.ready,
    need: `Braucht mindestens 2 vollständige Zyklen mit Blutung im Tagebuch und Garmin-Daten (bisher ${cp.cycles}).`,
    text:
      cp.beforeDiff === null
        ? ""
        : Math.abs(cp.beforeDiff) < 5
          ? "Deine HRV bleibt über den Zyklus ziemlich gleich. Die Zyklusphase muss bei der Trainingsplanung also kaum mitreden."
          : `In den 5 Tagen vor der Periode liegt deine HRV im Schnitt ${Math.abs(Math.round(cp.beforeDiff))} % ${cp.beforeDiff < 0 ? "niedriger" : "höher"} als im Rest des Zyklus.${cp.beforeDiff < 0 ? " Plane in diesen Tagen eher leichtere Einheiten." : ""}`,
    bars: cp.phases.map((p) => ({ label: p.label, value: p.hrv ?? 0, display: p.hrv === null ? "–" : Math.round(p.hrv) + " ms", highlight: p.label === "vor der Periode" })),
    basis: `${cp.cycles} Zyklen`,
  });

  // 2. Harte Tage und die Nacht danach
  const hardDays: string[] = [];
  const otherDays: string[] = [];
  for (const r of data.daily) {
    const l = loadPercent(r.day, data.daily, data.acts);
    (l >= HARD_DAY_PCT ? hardDays : otherDays).push(r.day);
  }
  const ss = sleepScores(data);
  const nextScore = (days: string[]) => days.map((d) => ss.get(addDays(d, 1)) ?? null).filter((v): v is number => v !== null);
  const nextHrv = (days: string[]) => days.map((d) => dm.get(addDays(d, 1))?.hrv_last_night ?? null).filter((v): v is number => v !== null);
  const hs = mean(nextScore(hardDays));
  const os = mean(nextScore(otherDays));
  const hh = mean(nextHrv(hardDays));
  const oh = mean(nextHrv(otherDays));
  const ready2 = nextScore(hardDays).length >= 5 && nextScore(otherDays).length >= 5;
  out.push({
    key: "nacht",
    title: "Harte Tage und die Nacht danach",
    ready: ready2,
    need: `Braucht mindestens 5 harte Trainingstage mit Schlafdaten in der Nacht danach (bisher ${nextScore(hardDays).length}).`,
    text:
      hs !== null && os !== null && hh !== null && oh !== null
        ? `Nach harten Tagen liegt dein Schlafwert im Schnitt bei ${Math.round(hs)} statt ${Math.round(os)}, die HRV bei ${Math.round(hh)} statt ${Math.round(oh)} ms.${hh < oh * 0.93 ? " Nach einem harten Tag tut dir ein leichter Tag gut." : ""}`
        : "",
    bars: [
      { label: "Schlaf nach hartem Tag", value: hs ?? 0, display: hs === null ? "–" : String(Math.round(hs)), highlight: true },
      { label: "Schlaf sonst", value: os ?? 0, display: os === null ? "–" : String(Math.round(os)) },
    ],
    basis: `${hardDays.length} harte Tage`,
  });

  // 3. Bedarfs-Hübe nach Situation
  const hubCount = new Map<string, number>();
  for (const h of data.hubs) hubCount.set(h.day, (hubCount.get(h.day) ?? 0) + 1);
  const sportDays = new Map<Sport, Set<string>>();
  for (const a of data.acts) {
    const sp = sportOf(a);
    const k: Sport = a.type_key && /run/.test(a.type_key) ? "ausdauer" : sp;
    if (!sportDays.has(k)) sportDays.set(k, new Set());
    sportDays.get(k)!.add((a.start_local ?? "").slice(0, 10));
  }
  const allDays = data.daily.map((r) => r.day);
  const restDays = allDays.filter((d) => ![...sportDays.values()].some((s) => s.has(d)));
  const beforeDays = allDays.filter((d) => cycleInfo(d, data.diary).beforePeriod);
  const rate = (days: string[]) => (days.length ? days.reduce((s, d) => s + (hubCount.get(d) ?? 0), 0) / days.length : null);
  const groups: { label: string; days: string[] }[] = [
    { label: "Ausdauer", days: [...(sportDays.get("ausdauer") ?? [])] },
    { label: "Bouldern", days: [...(sportDays.get("klettern") ?? [])] },
    { label: "Karate", days: [...(sportDays.get("karate") ?? [])] },
    { label: "Kettlebell", days: [...(sportDays.get("kettlebell") ?? [])] },
    { label: "Ruhetag", days: restDays },
    { label: "vor der Periode", days: beforeDays },
  ].filter((g) => g.days.length >= 3);
  const rates = groups.map((g) => ({ label: g.label, r: rate(g.days) ?? 0, n: g.days.length }));
  const top = [...rates].sort((a, b) => b.r - a.r)[0];
  const ready3 = data.hubs.length >= 6 && rates.length >= 2;
  out.push({
    key: "hub",
    title: "Bufori-Bedarf nach Situation",
    ready: ready3,
    need: `Braucht mindestens 6 Bedarfs-Hübe und Garmin-Aktivitäten (bisher ${data.hubs.length} Hübe).`,
    text: top && top.r > 0 ? `Am häufigsten brauchst du einen Bedarfs-Hub an Tagen mit ${top.label}: im Schnitt ${top.r.toFixed(1).replace(".", ",")} pro Tag. Dann vorher länger aufwärmen und das Mundausspülen nicht vergessen.` : "Bisher keine Häufung an bestimmten Tagen.",
    bars: rates.map((r) => ({ label: r.label, value: r.r, display: r.r.toFixed(1).replace(".", ","), highlight: r === top })),
    basis: `${data.hubs.length} Bedarfs-Hübe`,
  });

  // 4. Einflüsse und Nächte
  const infl = INFLUENCES.map((f) => f.key);
  const labels: Record<string, string> = Object.fromEntries(INFLUENCES.map((f) => [f.key, f.label]));
  const rows: { label: string; with: number; without: number; n: number }[] = [];
  for (const k of infl) {
    const withD = data.diary.filter((d) => d.influences?.includes(k)).map((d) => d.day);
    const withoutD = data.diary.filter((d) => !d.garminOnly && !d.influences?.includes(k)).map((d) => d.day);
    const sleep = (days: string[]) => days.map((d) => ss.get(addDays(d, 1)) ?? null).filter((v): v is number => v !== null);
    const a = mean(sleep(withD));
    const b = mean(sleep(withoutD));
    if (withD.length >= 4 && withoutD.length >= 4 && a !== null && b !== null) rows.push({ label: labels[k], with: a, without: b, n: withD.length });
  }
  const worst = [...rows].sort((x, y) => x.with - x.without - (y.with - y.without))[0];
  out.push({
    key: "einfluss",
    title: "Gewohnheiten und Schlaf",
    ready: rows.length > 0,
    need: "Braucht mindestens 4 Tage mit einem Einfluss im Tagebuch und Schlafdaten in der Nacht danach.",
    text:
      worst && worst.with < worst.without - 2
        ? `Nach Tagen mit „${worst.label}“ liegt dein Schlafwert im Schnitt bei ${Math.round(worst.with)} statt ${Math.round(worst.without)} (${pct(worst.with, worst.without)} %).`
        : "Bisher zeigt keine der Gewohnheiten einen deutlichen Unterschied beim Schlaf.",
    bars: rows.map((r) => ({ label: r.label, value: r.with, display: `${Math.round(r.with)} statt ${Math.round(r.without)}`, highlight: r === worst })),
    basis: rows.map((r) => `${r.label} ${r.n}×`).join(", ") || "noch keine",
  });

  // 5. Gefühl gegen Messwert
  const pairs = data.checkins
    .map((c) => ({ c, d: dm.get(c.day) }))
    .filter((p) => p.c.energy !== null && p.d?.bb_max !== null && p.d?.bb_max !== undefined);
  const byEnergy = [1, 2, 3].map((e) => mean(pairs.filter((p) => p.c.energy === e).map((p) => p.d!.bb_max as number)));
  out.push({
    key: "gefuehl",
    title: "Gefühl gegen Messwert",
    ready: pairs.length >= 10,
    need: `Braucht mindestens 10 Morgen-Check-ins mit Body Battery (bisher ${pairs.length}).`,
    text:
      byEnergy[0] !== null && byEnergy[2] !== null
        ? byEnergy[2]! - byEnergy[0]! > 15
          ? "Dein Gefühl und die Body Battery passen gut zusammen. Du kannst dich auf dein Energiegefühl verlassen."
          : "Dein Energiegefühl und die Body Battery gehen oft auseinander. Dann lohnt es sich, beides anzuschauen, bevor du hart trainierst."
        : "Noch nicht genug Tage mit niedriger und guter Energie zum Vergleichen.",
    bars: ["niedrig", "mittel", "gut"].map((l, i) => ({ label: `Energie ${l}`, value: byEnergy[i] ?? 0, display: byEnergy[i] === null ? "–" : String(Math.round(byEnergy[i]!)) })),
    basis: `${pairs.length} Check-ins`,
  });

  return out;
}

// Einträge, die nur garmin-sync angelegt hat (manual = false), zählen in Auswertungen nicht als eigener Tagebuch-Tag
export function markAutoRows<T extends { manual?: boolean | null }>(rows: T[]): (T & { garminOnly?: boolean })[] {
  return rows.map((r) => (r.manual === false ? { ...r, garminOnly: true } : r));
}

// Welche Symptome zählen für einen Tag?
// Heute eingetragen oder im Check-in beantwortet: die von heute, voll.
// Sonst die von gestern, aber nur halb, bis du im Check-in sagst, ob sie noch da sind.
export type SymptomBasis = { day: string; symptoms: Record<string, number>; weight: 1 | 0.5 };
export function symptomBasis(diary: Diary[], day: string): SymptomBasis | null {
  const has = (e: Diary | undefined) => !!e && Object.values(e.symptoms ?? {}).some((v) => v > 0);
  const t = diary.find((d) => d.day === day);
  if (has(t)) return { day, symptoms: t!.symptoms, weight: 1 };
  if (t?.symptoms_checked) return null;
  const y = diary.find((d) => d.day === addDays(day, -1));
  return has(y) ? { day: y!.day, symptoms: y!.symptoms, weight: 0.5 } : null;
}
