// Stress aus Garmin (0–100): Einordnung in Worten, Vergleich mit dem üblichen Wochentag, Aufteilung und Tagesrückblick.
// Reine Berechnungen ohne Netzwerk. Stufen wie bei Garmin: 0–25 Ruhe, 26–50 niedrig, 51–75 mittel, 76–100 hoch.

import { personalRange, seriesOf, type Range } from "@/lib/baseline";
import type { Daily } from "@/lib/garmin";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
export const ELEVATED = 51; // ab hier „erhöht“ (mittel oder hoch)

export function stressWord(v: number): string {
  if (v <= 25) return "Ruhe";
  if (v <= 50) return "Niedrig";
  if (v <= 75) return "Mittel";
  return "Hoch";
}

// Schnitt desselben Wochentags in den 8 Wochen davor, ab 3 Werten
export function usualWeekday(day: string, daily: Daily[]): number | null {
  const byDay = new Map(daily.map((d) => [d.day, d.stress_avg]));
  const v: number[] = [];
  for (let w = 1; w <= 8; w++) {
    const x = byDay.get(addDays(day, -7 * w));
    if (typeof x === "number") v.push(x);
  }
  return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export type StressDay = {
  value: number | null;
  word: string | null;
  weekday: string;
  usual: number | null; // üblicher Wochentag
  range: Range | null; // 30 Tage
  weekMax: { day: string; value: number } | null;
  split: { key: string; label: string; seconds: number; share: number }[] | null;
  longest: { start: number; minutes: number } | null; // längste Phase mit erhöhtem Stress (Minuten seit Mitternacht)
};

export function stressDay(day: string, daily: Daily[]): StressDay {
  const d = daily.find((r) => r.day === day);
  const value = typeof d?.stress_avg === "number" ? d.stress_avg : null;
  const last7 = daily.filter((r) => r.day > addDays(day, -7) && r.day <= day && typeof r.stress_avg === "number");
  const weekMax = last7.length ? last7.reduce((m, r) => ((r.stress_avg as number) > m.value ? { day: r.day, value: r.stress_avg as number } : m), { day: "", value: -1 }) : null;

  let split: StressDay["split"] = null;
  const parts = [
    { key: "ruhe", label: "Ruhe", seconds: d?.stress_rest_s ?? 0 },
    { key: "niedrig", label: "Niedrig", seconds: d?.stress_low_s ?? 0 },
    { key: "mittel", label: "Mittel", seconds: d?.stress_medium_s ?? 0 },
    { key: "hoch", label: "Hoch", seconds: d?.stress_high_s ?? 0 },
  ];
  const total = parts.reduce((a, p) => a + p.seconds, 0);
  if (total > 0) split = parts.map((p) => ({ ...p, share: p.seconds / total }));

  let longest: StressDay["longest"] = null;
  if (Array.isArray(d?.stress_curve)) {
    let start = -1;
    const curve = d.stress_curve;
    for (let i = 0; i <= curve.length; i++) {
      const v = curve[i];
      const high = typeof v === "number" && v >= ELEVATED;
      if (high && start < 0) start = i;
      if (!high && start >= 0) {
        const minutes = (i - start) * 15;
        if (!longest || minutes > longest.minutes) longest = { start: start * 15, minutes };
        start = -1;
      }
    }
  }

  return {
    value,
    word: value === null ? null : stressWord(value),
    weekday: WEEKDAYS[new Date(day + "T12:00:00").getDay()],
    usual: usualWeekday(day, daily),
    range: personalRange(seriesOf("stress", daily), day),
    weekMax,
    split,
    longest,
  };
}

const clockOf = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
export const duration = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
};

// Tagesrückblick in einem oder zwei Sätzen
export function stressSentence(s: StressDay): string {
  if (s.value === null) return "Für heute gibt es noch keinen Stresswert.";
  const out: string[] = [];
  if (s.split) {
    const top = [...s.split].sort((a, b) => b.seconds - a.seconds)[0];
    out.push(top.key === "ruhe" ? "Du warst die meiste Zeit in Ruhe." : `Du warst die meiste Zeit im Bereich „${top.label.toLowerCase()}“.`);
  }
  if (s.longest && s.longest.minutes >= 15) out.push(`Deine längste Phase mit erhöhtem Stress begann um ${clockOf(s.longest.start)} und dauerte ${duration(s.longest.minutes * 60)}.`);
  else if (s.split) out.push("Keine längere Phase mit erhöhtem Stress.");
  if (!out.length) {
    if (s.usual === null) out.push(`Stress heute im Schnitt ${s.value}, ${s.word?.toLowerCase()}. Der Vergleich mit einem üblichen ${s.weekday} entsteht ab 3 Wochen.`);
    else {
      const diff = s.value - s.usual;
      out.push(Math.abs(diff) < 5 ? `Heute so ruhig wie an einem üblichen ${s.weekday}.` : diff < 0 ? `Heute ruhiger als an einem üblichen ${s.weekday}.` : `Heute angespannter als an einem üblichen ${s.weekday}.`);
    }
  }
  return out.join(" ");
}
