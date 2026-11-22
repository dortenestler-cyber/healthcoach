// Gesundheit · Zyklus: Zykluslängen mit dem Bereich von vor einem Jahr, Hitzewallungen pro Woche,
// Symptome nach Zyklustag. Reine Berechnungen ohne Netzwerk, Zusammenhänge statt Ursachen.

import { middleHalf, type Range } from "@/lib/baseline";
import { SYMPTOMS } from "@/lib/catalog";
import { periodStarts, type Diary } from "@/lib/insights";

const DAY_MS = 864e5;
const MUSCLE_KEY = "_wade";
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const between = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DAY_MS);
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export type Cycle = { start: string; length: number };

// Abgeschlossene Zyklen mit plausibler Länge (15–60 Tage)
export function cycles(diary: Diary[]): Cycle[] {
  const s = periodStarts(diary);
  const out: Cycle[] = [];
  for (let i = 1; i < s.length; i++) {
    const l = between(s[i - 1], s[i]);
    if (l >= 15 && l <= 60) out.push({ start: s[i - 1], length: l });
  }
  return out;
}

// Letzte 12 Zyklen und der Bereich (mittlere Hälfte) aus Zyklen, die vor 12–24 Monaten begannen. Ab 3 solchen Zyklen.
export function cycleLengthView(diary: Diary[], today: string): { recent: Cycle[]; yearAgo: Range | null; yearAgoN: number } {
  const all = cycles(diary);
  const old = all.filter((c) => c.start >= addDays(today, -730) && c.start < addDays(today, -365));
  return { recent: all.slice(-12), yearAgo: middleHalf(old.map((c) => c.length), 3), yearAgoN: old.length };
}

// Hitzewallungen pro Woche (Montag bis Sonntag), älteste zuerst. Die laufende Woche zählt bis heute.
export function flashesPerWeek(times: string[], today: string, weeks = 12): { monday: string; count: number }[] {
  const mon = addDays(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
  const out = Array.from({ length: weeks }, (_, i) => ({ monday: addDays(mon, -7 * (weeks - 1 - i)), count: 0 }));
  for (const t of times) {
    const d = new Date(t);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const w = out.find((x) => day >= x.monday && day < addDays(x.monday, 7));
    if (w) w.count++;
  }
  return out;
}

// Schnitt der Wochen vor der laufenden Woche (für die Linie)
export const avgBefore = (w: { count: number }[]) => mean(w.slice(0, -1).map((x) => x.count));

// Symptome je Zyklustag über die letzten 4 abgeschlossenen Zyklen: Anteil der Zyklen mit Symptom an diesem Tag.
// Zeilen: die bis zu 5 häufigsten Symptome. Spalten: Zyklustag 1 bis zur längsten Länge (höchstens 35).
// muscle: stärkste Intensität von Wadenzucken und -krämpfen je Tag, erscheint als eigene Zeile „Wadenkrämpfe“.
export function symptomHeat(diary: Diary[], muscle?: Map<string, number>): { rows: { label: string; values: (number | null)[] }[]; columns: string[]; n: number } {
  const recent = cycles(diary).slice(-4);
  if (recent.length < 2) return { rows: [], columns: [], n: recent.length };
  const byDay = new Map(diary.map((d) => [d.day, d]));
  const len = Math.min(35, Math.max(...recent.map((c) => c.length)));
  const totals = new Map<string, number>();
  const counts = new Map<string, number[]>();
  for (const c of recent) {
    for (let i = 0; i < c.length && i < len; i++) {
      const day = addDays(c.start, i);
      const s: Record<string, number> = { ...(byDay.get(day)?.symptoms ?? {}), ...(muscle?.get(day) ? { [MUSCLE_KEY]: muscle.get(day)! } : {}) };
      for (const [k, v] of Object.entries(s)) {
        if (!v) continue;
        if (!counts.has(k)) counts.set(k, Array(len).fill(0));
        counts.get(k)![i]++;
        totals.set(k, (totals.get(k) ?? 0) + 1);
      }
    }
  }
  // Wie viele Zyklen reichen bis zu diesem Tag? Kürzere Zyklen zählen für späte Tage nicht mit.
  const reach = Array.from({ length: len }, (_, i) => recent.filter((c) => c.length > i).length);
  let top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  // Wadenkrämpfe immer zeigen, sobald es Einträge gibt
  if (totals.has(MUSCLE_KEY) && !top.includes(MUSCLE_KEY)) top = [...top.slice(0, 4), MUSCLE_KEY];
  const label = (k: string) => (k === MUSCLE_KEY ? "Wadenkrämpfe" : SYMPTOMS.find((s) => s.key === k)?.label ?? k);
  return {
    rows: top.map((k) => ({ label: label(k), values: counts.get(k)!.map((c, i) => (reach[i] ? c / reach[i] : null)) })),
    columns: Array.from({ length: len }, (_, i) => String(i + 1)),
    n: recent.length,
  };
}
