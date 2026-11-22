// Wärmeraster: Zeilen (z. B. Symptome) × Spalten (z. B. Zyklustage), Zelle = Häufigkeit 0–1.
// Fünf Stufen in Amber, Legende „selten“ bis „häufig“ steht immer dabei. Leere Zellen: keine Daten.

import { W, type Tone } from "@/components/charts/scale";

export type HeatRow = { label: string; values: (number | null)[] };

type Props = {
  rows: HeatRow[];
  columns: string[]; // Spaltenbeschriftung; nur jede n-te wird gezeigt
  label: string;
  every?: number; // jede wievielte Spalte beschriftet wird
  tone?: Tone;
};

const LABEL_W = 116;
const ROW_H = 22;
const GAP = 2;
const AXIS_H = 16;

export const heatLevel = (v: number | null) => (v === null ? -1 : v <= 0 ? 0 : v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : 4);

export default function Heatmap({ rows, columns, label, every = 7, tone = "warn" }: Props) {
  const cols = Math.max(columns.length, 1);
  const cw = (W - LABEL_W) / cols;
  const h = rows.length * ROW_H + AXIS_H;

  return (
    <figure className={`cb-figure cb-${tone}`}>
      <svg className="cb" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        {rows.map((r, ri) => (
          <g key={r.label}>
            <text x={0} y={ri * ROW_H + ROW_H / 2 + 4} className="cb-tick cb-tick-strong">
              {r.label}
            </text>
            {r.values.map((v, ci) => (
              <rect key={ci} x={LABEL_W + ci * cw + GAP / 2} y={ri * ROW_H + GAP / 2} width={Math.max(1, cw - GAP)} height={ROW_H - GAP} rx={3} className={`cb-heat-${heatLevel(v)}`}>
                <title>{`${r.label}, ${columns[ci]}: ${v === null ? "keine Daten" : `${Math.round(v * 100)} %`}`}</title>
              </rect>
            ))}
          </g>
        ))}
        {columns.map((c, ci) =>
          ci % every === 0 ? (
            <text key={ci} x={LABEL_W + ci * cw + cw / 2} y={h - 3} textAnchor="middle" className="cb-tick">
              {c}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="cb-legend">
        <span>selten</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className={`cb-heat-key cb-heat-${l}`} />
        ))}
        <span>häufig</span>
      </figcaption>
    </figure>
  );
}
