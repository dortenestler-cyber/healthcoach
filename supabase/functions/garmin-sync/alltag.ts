// Health Coach · Belastung aus dem Alltag (Konzept docs/konzept-korridore-alltagslast.md, Teil B)
// Reine Rechenfunktionen ohne Abrufe, damit sie sich leicht prüfen lassen.
// Der Aufbau des Ergebnisses steht auch in lib/alltagslast.ts (für die App).

// Gewicht pro Minute je Zone (Anteil zwischen Ruhepuls und Maximalpuls)
// Zone 0 Ruhe < 30 % · 1 locker 30–50 % · 2 zügig 50–60 % · 3 mittel 60–70 % · 4 hart 70–80 % · 5 sehr hart > 80 %
export const ZONE_LIMITS = [0.3, 0.5, 0.6, 0.7, 0.8];
export const HR_MAX_START = 170; // Startwert, solange keine Aktivität einen höheren Maximalpuls zeigt
export const HR_REST_START = 60;

// Leichte Bewegung im Alltag (Nutzerin 24.11.): ab 20 % zwischen Ruhepuls und Maximalpuls, unterhalb von Zone 1,
// zählt mit halbem Gewicht. Gehen im Alltag liegt oft hier (Vergleich mit Bevel: 5.800 Schritte ergaben 0 Minuten).
export const LIGHT_LIMIT = 0.2;
export const LIGHT_WEIGHT = 0.5;
const isLight = (hr: number, rest: number, max: number) => (hr - rest) / Math.max(20, max - rest) >= LIGHT_LIMIT;

export function zoneOf(hr: number, rest: number, max: number): number {
  const span = Math.max(20, max - rest);
  const frac = (hr - rest) / span;
  let z = 0;
  for (const lim of ZONE_LIMITS) if (frac >= lim) z++;
  return z;
}

export type Interval = { from: number; to: number; id?: number; start?: number }; // Minuten seit Mitternacht, Ortszeit; start = Beginn der Einheit (am Vortag negativ)

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
    out.push({ from: Math.max(0, from), to: Math.min(1440, to), id: a.activity_id, start: from });
  }
  return out;
}

export type Sample = { minute: number; hr: number }; // Minute seit Mitternacht (Ortszeit), Puls

// Version 2 (22.11.): Regel „Zone 1 ab 10 Minuten am Stück“. Version 3 (24.11.): leichte Bewegung ab 20 % zählt halb.
// Tage mit älterer Version rechnet garmin-sync neu.
export const LOAD_VERSION = 3;
export const ZONE1_MIN_RUN = 10; // Minuten am Stück, ab denen lockere Bewegung im Alltag zählt

export type LoadDay = {
  v: 3;
  quelle: "puls" | "schritte";
  // woran Bewegung im Alltag erkannt wurde: "stress" = Stresswert „Bewegung“ von Garmin,
  // "dauer" = kein Stressverlauf, Zone 1 zählt ab 10 Minuten am Stück, Zone 2 und höher immer
  bewegung: "stress" | "dauer";
  training: number[]; // Minuten je Zone 0–5 während Garmin-Aktivitäten
  alltag: number[]; // Minuten je Zone 0–5 außerhalb, nur mit Bewegung
  leicht: number; // Minuten leichte Bewegung im Alltag (unter Zone 1, ab 20 %), zählen mit halbem Gewicht
  ohne_bewegung: number; // Minuten ab Zone 1, die nicht zählen (ohne Bewegung oder Zone 1 kürzer als 10 Minuten)
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

// Pulsverlauf einer Einheit in Abschnitten zu 5 Minuten ab Beginn (Training-Insights)
export const SERIES_STEP = 5;
export type ActDetail = { zones: number[]; buckets: Map<number, { sum: number; n: number }> };

// Zonenminuten eines Tages. move(minute) sagt, ob in diesem Abschnitt Bewegung gemessen wurde.
// Ohne Bewegungsdaten (null): Zone 2 und höher zählt immer, Zone 1 und leichte Bewegung nur in Abschnitten,
// in denen der Puls mindestens 10 Minuten am Stück im leichten Bereich oder darüber liegt (Lücken bis 5 Minuten zählen mit).
export function computeDay(
  samples: Sample[],
  acts: Interval[],
  rest: number,
  max: number,
  move: ((minute: number) => boolean) | null,
): { training: number[]; alltag: number[]; leicht: number; ohne_bewegung: number; pkt_training: number; pkt_alltag: number; abdeckung: number; actPoints: Map<number, number>; actDetail: Map<number, ActDetail>; curve: (number | null)[] } {
  const training = [0, 0, 0, 0, 0, 0];
  const alltag = [0, 0, 0, 0, 0, 0];
  let ohne = 0;
  let leicht = 0;
  let abdeckung = 0;
  const actPoints = new Map<number, number>();
  const actDetail = new Map<number, ActDetail>();
  const sums = Array(96).fill(0);
  const counts = Array(96).fill(0);
  const s = [...samples].sort((a, b) => a.minute - b.minute);
  // Abschnitte mit Puls im leichten Bereich oder darüber (außerhalb von Aktivitäten zählen sie nur ab 10 Minuten)
  const longRun = new Array<boolean>(s.length).fill(false);
  for (let i = 0; i < s.length; ) {
    if (!isLight(s[i].hr, rest, max)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < s.length && isLight(s[j + 1].hr, rest, max) && s[j + 1].minute - s[j].minute <= 5) j++;
    const next = j + 1 < s.length ? s[j + 1].minute : s[j].minute + 2;
    const len = Math.min(next, s[j].minute + 5) - s[i].minute;
    if (len >= ZONE1_MIN_RUN) for (let k = i; k <= j; k++) longRun[k] = true;
    i = j + 1;
  }
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
      if (act.id !== undefined) {
        actPoints.set(act.id, (actPoints.get(act.id) ?? 0) + dur * z);
        const d = actDetail.get(act.id) ?? { zones: [0, 0, 0, 0, 0, 0], buckets: new Map() };
        d.zones[z] += dur;
        const b = Math.max(0, Math.floor((minute - (act.start ?? act.from)) / SERIES_STEP));
        const cur = d.buckets.get(b) ?? { sum: 0, n: 0 };
        cur.sum += hr;
        cur.n++;
        d.buckets.set(b, cur);
        actDetail.set(act.id, d);
      }
    } else if (z === 0) {
      alltag[0] += dur;
      if (isLight(hr, rest, max) && (move ? move(minute) : longRun[i])) leicht += dur;
    } else if (move ? move(minute) : z >= 2 || longRun[i]) {
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
    leicht: r1(leicht),
    ohne_bewegung: r1(ohne),
    pkt_training: r1(pts(training)),
    pkt_alltag: r1(pts(alltag) + leicht * LIGHT_WEIGHT),
    abdeckung: Math.round(abdeckung),
    actPoints,
    actDetail,
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

// Zonen und Pulsverlauf einer Einheit fürs Speichern. Abschnitte ohne Messung bleiben null.
export function actDetailRow(d: ActDetail, durationS: number | null): { hr_zones: number[]; hr_series: (number | null)[] } {
  const maxB = Math.max(-1, ...d.buckets.keys());
  const len = Math.min(288, Math.max(maxB + 1, durationS ? Math.ceil(durationS / 60 / SERIES_STEP) : 0));
  const series: (number | null)[] = [];
  for (let i = 0; i < len; i++) {
    const c = d.buckets.get(i);
    series.push(c && c.n ? Math.round(c.sum / c.n) : null);
  }
  return { hr_zones: d.zones.map(r1), hr_series: series };
}

// Mehrere Tage (Einheit über Mitternacht) zusammenführen
export function mergeActDetail(into: Map<number, ActDetail>, from: Map<number, ActDetail>): void {
  for (const [id, d] of from) {
    const t = into.get(id);
    if (!t) {
      into.set(id, { zones: [...d.zones], buckets: new Map(d.buckets) });
      continue;
    }
    d.zones.forEach((v, z) => (t.zones[z] += v));
    for (const [b, c] of d.buckets) {
      const cur = t.buckets.get(b) ?? { sum: 0, n: 0 };
      t.buckets.set(b, { sum: cur.sum + c.sum, n: cur.n + c.n });
    }
  }
}
