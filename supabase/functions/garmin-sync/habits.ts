// Health Coach · Gewohnheiten „Sport“ und „Stress“ automatisch aus Garmin (Nutzerin 23.11.)
// Reine Rechenfunktionen, der Abruf steht in index.ts (syncAutoHabits).

export const SPORT_MIN_S = 20 * 60; // Sport ab 20 Minuten Garmin-Aktivität
export const STRESS_FROM_MINUTE = 20 * 60; // Stress für heute erst ab 20 Uhr, vorher ist der Tagesschnitt nicht fertig
export const RANGE_DAYS = 30;
export const MIN_RANGE_VALUES = 7; // wie der vorläufige Bereich in lib/baseline.ts
export const AUTO_KEYS = ["sport", "stress"] as const;

const addDays = (day: string, n: number) => new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

function quantile(v: number[], q: number): number {
  const pos = (v.length - 1) * q;
  const i = Math.floor(pos);
  const f = pos - i;
  return i + 1 < v.length ? v[i] + f * (v[i + 1] - v[i]) : v[i];
}

// Obere Grenze des persönlichen Bereichs (75. Perzentil) aus den 30 Tagen vor `day`, wie personalRange in lib/baseline.ts
export function stressUpper(stressByDay: Map<string, number>, day: string): number | null {
  const v: number[] = [];
  for (let i = 1; i <= RANGE_DAYS; i++) {
    const x = stressByDay.get(addDays(day, -i));
    if (typeof x === "number" && x > 0) v.push(x);
  }
  if (v.length < MIN_RANGE_VALUES) return null;
  v.sort((a, b) => a - b);
  return quantile(v, 0.75);
}

export type Act = { start_local: string | null; duration_s: number | null; sport_override?: string | null };

// Welche automatischen Gewohnheiten an einem Tag gelten
export function autoFor(day: string, acts: Act[], stressByDay: Map<string, number>, today: string, nowMinute: number): string[] {
  const out: string[] = [];
  if (acts.some((a) => (a.start_local ?? "").slice(0, 10) === day && (a.duration_s ?? 0) >= SPORT_MIN_S && a.sport_override !== "ignorieren")) out.push("sport");
  const s = stressByDay.get(day);
  if (typeof s === "number" && s > 0 && (day < today || nowMinute >= STRESS_FROM_MINUTE)) {
    const hi = stressUpper(stressByDay, day);
    if (hi !== null && s > hi) out.push("stress");
  }
  return out;
}

export type Row = { day: string; influences: string[]; auto_set: string[]; auto_off: string[] };

// Neuer Stand eines Tages. Eigene Einträge bleiben: Was die Nutzerin selbst gesetzt hat, kommt nicht in auto_set
// und wird nie entfernt. Abgewählte (auto_off) setzt die App nicht wieder.
export function applyAuto(row: Row | null, want: string[]): { influences: string[]; auto_set: string[]; changed: boolean } {
  const influences = row?.influences ?? [];
  const prevAuto = row?.auto_set ?? [];
  const off = new Set(row?.auto_off ?? []);
  const w = want.filter((k) => !off.has(k));
  const autoSet = [...new Set([...prevAuto.filter((k) => w.includes(k) && influences.includes(k)), ...w.filter((k) => !influences.includes(k))])];
  const next = [...influences.filter((k) => !(prevAuto.includes(k) && !w.includes(k))), ...w.filter((k) => !influences.includes(k))];
  const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  return { influences: next, auto_set: autoSet, changed: !same(next, influences) || !same(autoSet, prevAuto) };
}
