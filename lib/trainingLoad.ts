// Training: Wochenlast mit Zielkorridor, Belastungsverhältnis und Intensitätsminuten.
// Standard: Last aus Training und Alltag. alltag = false: nur Training, wie bei Garmin.
// Reine Berechnungen ohne Netzwerk. Grenzen sind Startwerte, keine Aussage zum Verletzungsrisiko.

import type { Activity } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { loadByDay } from "@/lib/today";

export const RATIO_LO = 0.8; // darunter baust du ab
export const RATIO_HI = 1.3; // darüber steigt die Last schnell
export const WHO_MINUTES = 150; // WHO: mindestens 150 Minuten mäßige Bewegung pro Woche
export const WHO_STRENGTH_DAYS = 2; // WHO: zusätzlich an mindestens 2 Tagen Muskeltraining

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (iso: string) => addDays(iso, -((new Date(iso + "T12:00:00").getDay() + 6) % 7));
const sumRange = (m: Map<string, number>, from: string, n: number) => Array.from({ length: n }, (_, i) => m.get(addDays(from, i)) ?? 0).reduce((a, b) => a + b, 0);
const firstDay = (m: Map<string, number>) => [...m.keys()].sort()[0] ?? null;

export type WeekLoad = {
  days: { day: string; load: number | null; training: number | null }[]; // Montag bis Sonntag, kommende Tage null; training: Anteil Training
  sum: number;
  corridor: { lo: number; hi: number } | null; // aus den 4 Wochen davor, null bei zu wenig Daten
  avg4: number | null;
};

// Last dieser Woche (Montag bis heute) und Zielkorridor: 80–130 % des Schnitts der 4 Wochen davor
export function weekLoad(today: string, data: Data, alltag = true): WeekLoad {
  const m = loadByDay(data.acts, alltag ? data.daily : undefined);
  const t = loadByDay(data.acts);
  const mon = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    return { day: d, load: d > today ? null : Math.round(m.get(d) ?? 0), training: d > today ? null : Math.round(Math.min(m.get(d) ?? 0, t.get(d) ?? 0)) };
  });
  const sum = days.reduce((a, d) => a + (d.load ?? 0), 0);
  const first = firstDay(m);
  const enough = first !== null && first <= addDays(mon, -28);
  const avg4 = enough ? [1, 2, 3, 4].map((w) => sumRange(m, addDays(mon, -7 * w), 7)).reduce((a, b) => a + b, 0) / 4 : null;
  const corridor = avg4 ? { lo: Math.round(avg4 * RATIO_LO), hi: Math.round(avg4 * RATIO_HI) } : null;
  return { days, sum, corridor, avg4 };
}

// Belastungsverhältnis: Last der letzten 7 Tage ÷ Wochenschnitt der letzten 28 Tage
export function loadRatio(today: string, data: Data, alltag = true): { ratio: number | null; acute: number; chronic: number | null } {
  const m = loadByDay(data.acts, alltag ? data.daily : undefined);
  const acute = sumRange(m, addDays(today, -6), 7);
  const first = firstDay(m);
  if (first === null || first > addDays(today, -27)) return { ratio: null, acute, chronic: null };
  const chronic = sumRange(m, addDays(today, -27), 28) / 4;
  return { ratio: chronic > 0 ? acute / chronic : null, acute, chronic };
}

export function ratioText(r: number): string {
  if (r < RATIO_LO) return "Deine Belastung ist zuletzt niedriger als üblich. Unter 0,8 baust du ab.";
  if (r > RATIO_HI) return "Deine Belastung steigt gerade schnell. Über 1,3 lieber ein paar ruhigere Tage einplanen.";
  return "Deine Belastung steigt gleichmäßig.";
}

// Intensitätsminuten (Nutzerin 25.11.): Garmins Tageswert, dazu zählt jede Trainingsminute mindestens moderat.
// Minuten, die Garmin in der Einheit schon gezählt hat, bleiben (intensive doppelt), der Rest der Einheit kommt einfach dazu.
// Gehen zählt nur mit Garmins Minuten, außer die Einheit ist in der App einer Sportart zugeordnet. „Ignorieren“ zählt nicht.
const WALK = /^(walking|casual_walking)$/;
const GARMIN_ZONE_FROM = 2; // ohne Garmins Werte je Einheit: Minuten ab Zone 2 gelten als von Garmin gezählt

export function extraIntensity(a: Activity): number {
  if (a.sport_override === "ignorieren") return 0;
  if (!a.sport_override && WALK.test(a.type_key ?? "")) return 0;
  const dur = (a.duration_s ?? 0) / 60;
  if (dur <= 0) return 0;
  const counted =
    a.im_moderate != null || a.im_vigorous != null
      ? (a.im_moderate ?? 0) + (a.im_vigorous ?? 0)
      : Array.isArray(a.hr_zones)
        ? a.hr_zones.slice(GARMIN_ZONE_FROM).reduce((s, v) => s + (Number(v) || 0), 0)
        : 0;
  return Math.max(0, Math.round(dur - counted));
}

export function dayIntensity(day: string, data: Data): number {
  const garmin = data.daily.find((d) => d.day === day)?.intensity_minutes ?? 0;
  return garmin + data.acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day).reduce((s, a) => s + extraIntensity(a), 0);
}

// Intensitätsminuten dieser Woche (Montag bis heute)
export function weekIntensity(today: string, data: Data): number {
  const mon = mondayOf(today);
  let sum = 0;
  for (let d = mon; d <= today; d = addDays(d, 1)) sum += dayIntensity(d, data);
  return sum;
}
