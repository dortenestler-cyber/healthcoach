// Health Coach · Belastung aus dem Alltag (Konzept docs/konzept-korridore-alltagslast.md, Teil B)
// Reine Rechenfunktionen ohne Abrufe, damit sie sich leicht prüfen lassen.
// Der Aufbau des Ergebnisses steht auch in lib/alltagslast.ts (für die App).

// Gewicht pro Minute je Zone (Anteil zwischen Ruhepuls und Maximalpuls)
// Zone 0 Ruhe < 30 % · 1 locker 30–50 % · 2 zügig 50–60 % · 3 mittel 60–70 % · 4 hart 70–80 % · 5 sehr hart > 80 %
export const ZONE_LIMITS = [0.3, 0.5, 0.6, 0.7, 0.8];
export const HR_MAX_START = 170; // Startwert, solange keine Aktivität einen höheren Maximalpuls zeigt
export const HR_REST_START = 60;

export function zoneOf(hr: number, rest: number, max: number): number {
  const span = Math.max(20, max - rest);
  const frac = (hr - rest) / span;
  let z = 0;
  for (const lim of ZONE_LIMITS) if (frac >= lim) z++;
  return z;
}

export type Interval = { from: number; to: number; id?: number }; // Minuten seit Mitternacht, Ortszeit

// Aktivitäten eines Tages als Zeitfenster. start_local ist Ortszeit „JJJJ-MM-TT HH:MM:SS“.
// Eine Einheit vom Vortag, die über Mitternacht geht, zählt mit ihrem Rest.
export function activityIntervals(day: string, acts: { activity_id: number; start_local: string | null; duration_s: number | null }[]): Interval[] {
  const out: Interval[] = [];
  const dayStart = Date.parse(day + "T00:00:00Z");
  for (const a of acts) {
    if (!a.start_local || !a.duration_s) continue;
    const t = Date.parse(a.start_local.replace(" ", "T").slice(0, 19) + "Z");
    if (!Number.isFinite(t)) continue;
    const from = (t - dayStart) / 60000;
    const to = from + a.duration_s / 60;
    if (to <= 0 || from >= 1440) continue;
    out.push({ from: Math.max(0, from), to: Math.min(1440, to), id: a.activity_id });
  }
  return out;
}

export type Sample = { minute: number; hr: number }; // Minute seit Mitternacht (Ortszeit), Puls

export type LoadDay = {
  v: 1;
  quelle: "puls" | "schritte";
  bewegung: "schritte" | "stress" | "keine"; // woran Bewegung im Alltag erkannt wurde
  training: number[]; // Minuten je Zone 0–5 während Garmin-Aktivitäten
  alltag: number[]; // Minuten je Zone 0–5 außerhalb, nur mit Bewegung
  ohne_bewegung: number; // Minuten ab Zone 1 ohne Bewegung (z. B. Stress), zählen nicht
  pkt_training: number; // Pulspunkte = Minuten × Zonengewicht
  pkt_alltag: number;
  abdeckung: number; // Minuten mit Pulsdaten
  puls_ruhe: number;
  puls_max: number;
  puls_max_quelle: "aktivitaeten" | "startwert";
  last_training: number; // Garmin-Trainingsbelastung der Aktivitäten des Tages
  faktor: number | null; // Garmin-Last pro Pulspunkt (Median der letzten 30 Trainings)
  faktor_n: number; // wie viele Trainings in den Faktor eingeflossen sind
  last_alltag: number | null; // Alltag umgerechnet in Garmin-Last
};

const r1 = (n: number) => Math.round(n * 10) / 10;

// Zonenminuten eines Tages. move(minute) sagt, ob in diesem Abschnitt Bewegung gemessen wurde;
// ohne Bewegungsdaten (null) zählt der Alltag erst ab Zone 2.
export function computeDay(
  samples: Sample[],
  acts: Interval[],
  rest: number,
  max: number,
  move: ((minute: number) => boolean) | null,
): { training: number[]; alltag: number[]; ohne_bewegung: number; pkt_training: number; pkt_alltag: number; abdeckung: number; actPoints: Map<number, number>; curve: (number | null)[] } {
  const training = [0, 0, 0, 0, 0, 0];
  const alltag = [0, 0, 0, 0, 0, 0];
  let ohne = 0;
  let abdeckung = 0;
  const actPoints = new Map<number, number>();
  const sums = Array(96).fill(0);
  const counts = Array(96).fill(0);
  const s = [...samples].sort((a, b) => a.minute - b.minute);
  for (let i = 0; i < s.length; i++) {
    const { minute, hr } = s[i];
    if (minute < 0 || minute >= 1440) continue;
    // Dauer bis zum nächsten Wert, höchstens 5 Minuten (Lücke = Uhr nicht getragen)
    const next = i + 1 < s.length ? s[i + 1].minute : minute + 2;
    const dur = Math.min(5, Math.max(0, next - minute)) || 2;
    abdeckung += dur;
    const b = Math.floor(minute / 15);
    sums[b] += hr;
    counts[b]++;
    const z = zoneOf(hr, rest, max);
    const act = acts.find((a) => minute >= a.from && minute < a.to);
    if (act) {
      training[z] += dur;
      if (act.id !== undefined) actPoints.set(act.id, (actPoints.get(act.id) ?? 0) + dur * z);
    } else if (z === 0) {
      alltag[0] += dur;
    } else if (move ? move(minute) : z >= 2) {
      alltag[z] += dur;
    } else {
      alltag[0] += dur;
      ohne += dur;
    }
  }
  const pts = (m: number[]) => m.reduce((a, v, z) => a + v * z, 0);
  return {
    training: training.map(r1),
    alltag: alltag.map(r1),
    ohne_bewegung: r1(ohne),
    pkt_training: r1(pts(training)),
    pkt_alltag: r1(pts(alltag)),
    abdeckung: Math.round(abdeckung),
    actPoints,
    curve: sums.map((v, i) => (counts[i] ? Math.round(v / counts[i]) : null)),
  };
}

// Persönlicher Umrechnungsfaktor: Median von Garmin-Last ÷ Pulspunkte der letzten 30 Trainings.
// Einheiten unter 10 Pulspunkten oder ohne Garmin-Last zählen nicht.
export function conversionFactor(acts: { training_load: number | null; hr_points: number | null }[]): { faktor: number | null; n: number } {
  const ratios = acts
    .filter((a) => (a.training_load ?? 0) > 0 && (a.hr_points ?? 0) >= 10)
    .slice(0, 30)
    .map((a) => (a.training_load as number) / (a.hr_points as number))
    .sort((a, b) => a - b);
  if (ratios.length < 3) return { faktor: null, n: ratios.length };
  const m = Math.floor(ratios.length / 2);
  const med = ratios.length % 2 ? ratios[m] : (ratios[m - 1] + ratios[m]) / 2;
  return { faktor: Math.round(med * 1000) / 1000, n: ratios.length };
}

// Startwert, solange es noch keinen persönlichen Faktor gibt (weniger als 3 Trainings mit Puls):
// grob eine Garmin-Last je 2 Pulspunkte (eine Stunde zügig bis mittel ≈ 75–100 Last). Erkennbar an faktor = null.
export const FACTOR_START = 0.5;

// Rückfall ohne Pulsdaten: Schritte außerhalb von Aktivitäten als lockere Bewegung (Zone 1),
// etwa 100 Schritte pro Minute.
export function pointsFromSteps(stepsOutside: number | null): number {
  return stepsOutside && stepsOutside > 0 ? r1(stepsOutside / 100) : 0;
}

export const MIN_COVERAGE = 8 * 60; // unter 8 Stunden Pulsdaten gilt der Tag als „Uhr nicht getragen“
