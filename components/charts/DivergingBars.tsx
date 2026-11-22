// Balken um den Nullpunkt: Unterschied je Zeile, rechts mehr, links weniger. Zahl mit Vorzeichen und Anzahl stehen immer dabei.
// Positive Werte in der Farbe des Tons, negative neutral: keine Ampelfarben.

import { W, type Tone } from "@/components/charts/scale";

export type DivRow = { label: string; value: number | null; note: string };

const ROW = 40;
const LABEL_W = 120;
const VALUE_W = 64;

export default function DivergingBars({ rows, fmt, label, tone = "recovery" }: { rows: DivRow[]; fmt: (v: number) => string; label: string; tone?: Tone }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value ?? 0)));
  const x0 = LABEL_W + (W - LABEL_W - VALUE_W) / 2;
  const half = (W - LABEL_W - VALUE_W) / 2 - 4;
  const h = rows.length * ROW;
  return (
    <svg className={`cb cb-${tone}`} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
      <line x1={x0} x2={x0} y1={0} y2={h} className="cb-zero" />
      {rows.map((r, i) => {
        const cy = i * ROW + ROW / 2 - 4;
        const w = r.value === null ? 0 : (Math.abs(r.value) / max) * half;
        return (
          <g key={r.label}>
            <text x={0} y={cy + 4} className="cb-tick cb-tick-strong">{r.label}</text>
            <text x={0} y={cy + 17} className="cb-tick">{r.note}</text>
            {r.value !== null && <rect x={r.value >= 0 ? x0 : x0 - w} width={Math.max(2, w)} y={cy - 7} height={14} rx={4} className={r.value >= 0 ? "cb-bar-pos" : "cb-bar-neg"} />}
            <text x={W} y={cy + 4} textAnchor="end" className={r.value === null ? "cb-tick" : "cb-value"}>
              {r.value === null ? "–" : `${r.value > 0 ? "+" : r.value < 0 ? "−" : "±"}${fmt(Math.abs(r.value))}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
