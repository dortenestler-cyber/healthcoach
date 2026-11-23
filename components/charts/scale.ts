// Gemeinsame Hilfen für die Diagramm-Bausteine: echte Achsen statt Streckung auf 100 × 100.
// Die Bausteine messen ihre echte Breite (useChartWidth, eigene Datei) und zeichnen in echten Pixeln (Sammelliste Punkt 15).
// So bleiben Schrift und Linien am Computer so groß wie auf dem iPhone, nur die Breite wächst.

export const W = 326; // Innenbreite einer Karte auf dem iPhone (390 px minus Ränder), Startwert vor dem Messen

// Höhe wächst mit der Breite nur leicht: höchstens 30 % über der iPhone-Höhe
export function grownHeight(base: number, w: number): number {
  return Math.round(base * (1 + Math.min(0.3, Math.max(0, (w - W) / 1800))));
}

export type Tone = "recovery" | "energy" | "cycle" | "menses" | "training" | "warn" | "mobility" | "sleep" | "stress" | "neutral";

// Lineare Abbildung von [d0, d1] auf [r0, r1]
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

// 2–3 runde Hilfslinien, die den Wertebereich einschließen
export function niceTicks(min: number, max: number, count = 3): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    min -= d;
    max += d;
  }
  const raw = (max - min) / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Number(v.toFixed(10)));
  // höchstens drei Linien: bei zu vielen nur Rand und Mitte
  return out.length > 3 ? [out[0], out[Math.round((out.length - 1) / 2)], out[out.length - 1]] : out;
}

// Wertebereich über mehrere Listen, Bänder zählen mit
export function extent(...lists: (number | null | undefined)[][]): [number, number] | null {
  const v = lists.flat().filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
}

// Linie mit Lücken: eine Teilstrecke pro zusammenhängendem Abschnitt
export function segments(pts: ({ x: number; y: number } | null)[]): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const p of pts) {
    if (p) cur.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    else if (cur.length) {
      out.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

export const de = (v: number, digits = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Weiche Kurve durch Punkte (monotone kubische Interpolation, Sammelliste Punkt 17):
// keine Überschwinger, die Kurve bleibt zwischen benachbarten Werten. Liefert die Befehle ab dem ersten Punkt ohne „M“.
export function monotoneCurve(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  if (n === 0) return "";
  if (n === 1) return `${f(pts[0].x)},${f(pts[0].y)}`;
  const m: number[] = [];
  for (let k = 0; k < n - 1; k++) m.push((pts[k + 1].y - pts[k].y) / (pts[k + 1].x - pts[k].x || 1));
  const t: number[] = pts.map((_, k) => (k === 0 ? m[0] : k === n - 1 ? m[n - 2] : m[k - 1] * m[k] <= 0 ? 0 : (m[k - 1] + m[k]) / 2));
  for (let k = 0; k < n - 1; k++) {
    if (m[k] === 0) {
      t[k] = 0;
      t[k + 1] = 0;
      continue;
    }
    const a = t[k] / m[k];
    const b = t[k + 1] / m[k];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      t[k] = tau * a * m[k];
      t[k + 1] = tau * b * m[k];
    }
  }
  let d = `${f(pts[0].x)},${f(pts[0].y)}`;
  for (let k = 0; k < n - 1; k++) {
    const dx = (pts[k + 1].x - pts[k].x) / 3;
    d += `C${f(pts[k].x + dx)},${f(pts[k].y + t[k] * dx)} ${f(pts[k + 1].x - dx)},${f(pts[k + 1].y - t[k + 1] * dx)} ${f(pts[k + 1].x)},${f(pts[k + 1].y)}`;
  }
  return d;
}

// Weiche Fläche zwischen Ober- und Unterkante (gleiche x-Werte), an den Enden über die volle Tagesbreite
export function smoothBand(xs: number[], hi: number[], lo: number[], half: number): string {
  if (!xs.length) return "";
  const ext = (arr: number[]) => [{ x: xs[0] - half, y: arr[0] }, ...xs.map((x, i) => ({ x, y: arr[i] })), { x: xs[xs.length - 1] + half, y: arr[arr.length - 1] }];
  const top = ext(hi);
  const bottom = ext(lo).reverse();
  return `M${monotoneCurve(top)}L${monotoneCurve(bottom)}Z`;
}
