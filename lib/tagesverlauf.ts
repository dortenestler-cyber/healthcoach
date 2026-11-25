// Tagesverlauf aus Zwischenständen (Nutzerin 25.11., Migration 20261130140000_tagesverlauf).
// garmin-sync speichert bei jedem Abruf die bisherigen Tageswerte mit Uhrzeit. Der Unterschied zweier Stände
// wird gleichmäßig auf die Zeit dazwischen verteilt und je Stunde gesammelt. Vor dem ersten Stand gilt Mitternacht mit 0.
// Reine Berechnungen ohne Netzwerk, bis auf loadSnapshots.

import type { Activity } from "@/lib/garmin";
import { extraIntensity } from "@/lib/trainingLoad";

export type Snapshot = {
  at: string;
  day: string;
  steps: number | null;
  intensity_minutes: number | null;
  stress_avg: number | null;
  stress_rest_s: number | null;
  stress_low_s: number | null;
  stress_medium_s: number | null;
  stress_high_s: number | null;
};

export type DayCurve = {
  steps: (number | null)[]; // 24 Werte, Schritte je Stunde
  intensity: (number | null)[]; // Intensitätsminuten je Stunde, mit Trainingsminuten wie im Ring
  stress: (number | null)[]; // Stress im Schnitt je Stunde, 0–100
  lastHour: number | null; // Stunde des letzten Stands
};

// Stress der Stunde, ab dem ein Nachmittag als angespannt gilt (Garmin: ab 51 mittlerer Stress)
export const TENSE_STRESS = 51;
export const AFTERNOON = [14, 20] as const; // 14 bis 20 Uhr

const TZ = "Europe/Berlin";
const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Minuten seit Mitternacht (Ortszeit) eines Zeitpunkts
export function minuteOf(iso: string): number {
  const p = Object.fromEntries(parts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return Number(p.hour) * 60 + Number(p.minute);
}

// Wert gleichmäßig auf die Minuten [from, to) verteilen und je Stunde aufsummieren
function spread(bins: number[], from: number, to: number, value: number) {
  if (!(to > from) || !value) return;
  const per = value / (to - from);
  for (let h = Math.floor(from / 60); h < 24 && h * 60 < to; h++) {
    const a = Math.max(from, h * 60);
    const b = Math.min(to, (h + 1) * 60);
    if (b > a) bins[h] += per * (b - a);
  }
}

const measured = (s: Snapshot) => (s.stress_rest_s ?? 0) + (s.stress_low_s ?? 0) + (s.stress_medium_s ?? 0) + (s.stress_high_s ?? 0);

export function dayCurve(day: string, snaps: Snapshot[], acts: Activity[]): DayCurve {
  const list = snaps.filter((s) => s.day === day).sort((a, b) => a.at.localeCompare(b.at));
  const steps = Array<number>(24).fill(0);
  const im = Array<number>(24).fill(0);
  const stressSum = Array<number>(24).fill(0);
  const stressSec = Array<number>(24).fill(0);
  let prev: Snapshot | null = null;
  let prevMin = 0;
  for (const s of list) {
    const m = minuteOf(s.at);
    if (m < prevMin) continue;
    spread(steps, prevMin, m, Math.max(0, (s.steps ?? 0) - (prev?.steps ?? 0)));
    spread(im, prevMin, m, Math.max(0, (s.intensity_minutes ?? 0) - (prev?.intensity_minutes ?? 0)));
    // Stress des Abschnitts: Summe Stress × gemessene Zeit jetzt minus vorher, geteilt durch die neu gemessene Zeit
    const t1 = prev ? measured(prev) : 0;
    const t2 = measured(s);
    if (s.stress_avg !== null && t2 > t1) {
      const level = Math.min(100, Math.max(0, (s.stress_avg * t2 - (prev?.stress_avg ?? 0) * t1) / (t2 - t1)));
      const sec = Array<number>(24).fill(0);
      spread(sec, prevMin, m, t2 - t1);
      sec.forEach((v, h) => {
        stressSum[h] += v * level;
        stressSec[h] += v;
      });
    }
    prev = s;
    prevMin = m;
  }
  // Trainingsminuten, die Garmin nicht zählt, über die Dauer der Einheit verteilen (wie im Ring „Intensität“)
  for (const a of acts) {
    if ((a.start_local ?? "").slice(0, 10) !== day) continue;
    const x = extraIntensity(a);
    const from = Number(a.start_local!.slice(11, 13)) * 60 + Number(a.start_local!.slice(14, 16));
    if (x && Number.isFinite(from)) spread(im, from, Math.min(1440, from + (a.duration_s ?? 0) / 60), x);
  }
  const lastHour = list.length ? Math.floor(Math.min(1439, prevMin) / 60) : null;
  const upTo = (h: number) => lastHour !== null && h <= lastHour;
  return {
    steps: steps.map((v, h) => (upTo(h) ? Math.round(v) : null)),
    intensity: im.map((v, h) => (upTo(h) || v > 0 ? Math.round(v) : null)),
    stress: stressSum.map((v, h) => (upTo(h) && stressSec[h] > 0 ? Math.round(v / stressSec[h]) : null)),
    lastHour,
  };
}

// Stress am Nachmittag (14–20 Uhr) im Schnitt, null ohne Werte
export function afternoonStress(c: DayCurve): number | null {
  const v = c.stress.slice(AFTERNOON[0], AFTERNOON[1]).filter((x): x is number => x !== null);
  return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Stunde mit dem höchsten Wert, für den Satz über dem Diagramm
export function peakHour(values: (number | null)[]): number | null {
  let best: number | null = null;
  values.forEach((v, h) => {
    if (v !== null && v > 0 && (best === null || v > (values[best] ?? 0))) best = h;
  });
  return best;
}

// Zwischenstände laden. Fehlt die Tabelle noch (Migration nicht gelaufen), bleibt die Liste leer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadSnapshots(sb: any, from: string, to?: string): Promise<Snapshot[]> {
  let q = sb.from("garmin_snapshots").select("at, day, steps, intensity_minutes, stress_avg, stress_rest_s, stress_low_s, stress_medium_s, stress_high_s").gte("day", from);
  if (to) q = q.lte("day", to);
  const { data, error } = await q.order("at");
  return error ? [] : ((data ?? []) as Snapshot[]);
}
