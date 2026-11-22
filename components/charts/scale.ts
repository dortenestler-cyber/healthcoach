// Gemeinsame Hilfen für die Diagramm-Bausteine: echte Achsen statt Streckung auf 100 × 100.
// Alle Bausteine zeichnen in einem festen Seitenverhältnis (Breite W) und skalieren als Ganzes mit.

export const W = 326; // Innenbreite einer Karte auf dem iPhone (390 px minus Ränder)

export type Tone = "recovery" | "cycle" | "menses" | "training" | "warn" | "mobility" | "sleep" | "neutral";

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
