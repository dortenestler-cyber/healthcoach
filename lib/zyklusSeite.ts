// Seite Zyklus: Ring, was in der heutigen Phase bei dir üblich ist, Werte nach Zyklustag und Einflüsse je Phase.
// Reine Berechnungen ohne Netzwerk. Phasen sind geschätzt, alles sind Zusammenhänge aus den eigenen Daten, keine Diagnosen.

import { INFLUENCES } from "@/lib/catalog";
import { cycleToday, groupOf, phaseFor, PHASES, type Phase, type PhaseGroup } from "@/lib/cycle";
import { METRICS, type MetricKey } from "@/lib/garmin";
import { loadPercent, periodStarts, type Data } from "@/lib/insights";

const DAY_MS = 864e5;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const between = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DAY_MS);
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export const MIN_DAYS = 5; // so viele Tage braucht ein Vergleich je Gruppe
export const CYCLE_METRICS: MetricKey[] = ["hrv", "ruhepuls", "temperatur", "schlaf", "bb"];

// ---------- Ring

export type Arc = { group: PhaseGroup; from: number; to: number }; // Zyklustage, einschließlich

// Phasenbögen für eine Zykluslänge, zusammengefasst zu Menstruation, Follikel (mit Eisprung) und Luteal
export function ringArcs(length: number): Arc[] {
  const out: Arc[] = [];
  for (let d = 1; d <= length; d++) {
    const g = groupOf(phaseFor(d, length)) as PhaseGroup;
    const last = out[out.length - 1];
    if (last && last.group === g) last.to = d;
    else out.push({ group: g, from: d, to: d });
  }
  return out;
}

// ---------- Heute in deinem Zyklus

export type PhaseRow = { key: MetricKey; label: string; phase: number | null; all: number | null; n: number; fmt: (v: number) => string; higherIsBetter: boolean };

// Schnitt jedes Werts in der heutigen Phase (letzte 6 Monate) gegen den Schnitt aller Tage
export function phaseProfile(day: string, data: Data, phase: Phase): PhaseRow[] {
  const recent = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -180));
  const inPhase = recent.filter((r) => cycleToday(r.day, data.diary).phase === phase);
  return (["hrv", "ruhepuls", "temperatur", "schlaf"] as MetricKey[]).map((k) => {
    const m = METRICS[k];
    const p = inPhase.map(m.value).filter((v): v is number => v !== null);
    const a = recent.map(m.value).filter((v): v is number => v !== null);
    return { key: k, label: m.label, phase: p.length >= MIN_DAYS ? mean(p) : null, all: a.length >= MIN_DAYS ? mean(a) : null, n: p.length, fmt: m.fmt, higherIsBetter: m.higherIsBetter };
  });
}

export const phaseText = (p: Phase) => PHASES[p];

// ---------- Werte nach Zyklustag

export type ByCycleDay = {
  length: number; // Spalten (Zyklustage)
  current: (number | null)[]; // laufender Zyklus bis heute
  usual: (number | null)[]; // Schnitt der früheren Zyklen je Zyklustag, ab 2 Zyklen
  cycles: number; // frühere Zyklen mit Werten
  phases: PhaseGroup[];
  todayIndex: number | null;
};

// Laufender Zyklus gegen den Schnitt der bis zu 6 Zyklen davor, Tag für Tag
export function byCycleDay(key: MetricKey, day: string, data: Data): ByCycleDay {
  const m = METRICS[key];
  const byDay = new Map(data.daily.map((r) => [r.day, r]));
  const v = (d: string) => {
    const r = byDay.get(d);
    return r ? m.value(r) : null;
  };
  const starts = periodStarts(data.diary).filter((s) => s <= day);
  const ci = cycleToday(day, data.diary);
  const cur = starts[starts.length - 1];
  const curDay = cur ? between(cur, day) + 1 : null;
  const length = Math.min(45, Math.max(ci.length, curDay ?? 0));
  const current = Array.from({ length }, (_, i) => (cur && curDay !== null && i < curDay ? v(addDays(cur, i)) : null));
  const prev: string[][] = [];
  for (let i = Math.max(1, starts.length - 7); i < starts.length; i++) {
    const l = between(starts[i - 1], starts[i]);
    if (l >= 15 && l <= 60) prev.push(Array.from({ length: l }, (_, k) => addDays(starts[i - 1], k)));
  }
  const usual = Array.from({ length }, (_, i) => {
    const vals = prev.map((c) => (i < c.length ? v(c[i]) : null)).filter((x): x is number => x !== null);
    return vals.length >= 2 ? mean(vals) : null;
  });
  const cycles = prev.filter((c) => c.some((d) => v(d) !== null)).length;
  return { length, current, usual, cycles, phases: Array.from({ length }, (_, i) => groupOf(phaseFor(i + 1, ci.length)) as PhaseGroup), todayIndex: curDay !== null && curDay <= length ? curDay - 1 : null };
}

// ---------- Was dir guttut, je Phase

export type PhaseEffect = { key: string; label: string; follikel: number | null; luteal: number | null; nF: number; nL: number };

// HRV der Folgenacht, Tage mit Einfluss gegen Tage ohne, getrennt nach Follikel- und Lutealphase des Tages
export function effectsByPhase(data: Data): PhaseEffect[] {
  const hrv = new Map(data.daily.map((d) => [d.day, d.hrv_last_night]));
  const next = (d: string) => hrv.get(addDays(d, 1)) ?? null;
  const groupOfDay = new Map<string, PhaseGroup | null>();
  const g = (d: string) => {
    if (!groupOfDay.has(d)) groupOfDay.set(d, groupOf(cycleToday(d, data.diary).phase));
    return groupOfDay.get(d)!;
  };
  const diff = (withD: string[], withoutD: string[], phase: PhaseGroup) => {
    const a = withD.filter((d) => g(d) === phase).map(next).filter((x): x is number => x !== null);
    const b = withoutD.filter((d) => g(d) === phase).map(next).filter((x): x is number => x !== null);
    return { d: a.length >= MIN_DAYS && b.length >= MIN_DAYS ? (mean(a) as number) - (mean(b) as number) : null, n: a.length };
  };
  const rows: { key: string; label: string; withD: string[]; withoutD: string[] }[] = [];
  const diaryDays = data.diary.filter((d) => !d.garminOnly).map((d) => d.day); // nur Tage mit eigenem Eintrag
  for (const i of INFLUENCES) {
    const withD = data.diary.filter((d) => d.influences?.includes(i.key)).map((d) => d.day);
    rows.push({ key: i.key, label: i.label, withD, withoutD: diaryDays.filter((d) => !withD.includes(d)) });
  }
  const days = data.daily.map((d) => d.day);
  const hard = days.filter((d) => loadPercent(d, data.daily, data.acts) >= 70);
  rows.push({ key: "hart", label: "Harter Trainingstag", withD: hard, withoutD: days.filter((d) => !hard.includes(d)) });
  return rows.map((r) => {
    const f = diff(r.withD, r.withoutD, "follikel");
    const l = diff(r.withD, r.withoutD, "luteal");
    return { key: r.key, label: r.label, follikel: f.d, luteal: l.d, nF: f.n, nL: l.n };
  });
}
