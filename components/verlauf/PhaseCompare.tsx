"use client";

import { extent, linear, type Tone } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";

import type { Range } from "@/lib/baseline";
import { PHASE_GROUPS, type PhaseGroup } from "@/lib/cycle";

type Props = {
  means: Record<PhaseGroup, { mean: number | null; n: number }>;
  range: Range | null; // persönlicher Bereich als Band hinter allen drei Zeilen
  ranges?: Partial<Record<PhaseGroup, Range | null>>; // Bereich je Phase: ersetzt das gemeinsame Band in der jeweiligen Zeile
  fmt: (v: number) => string;
  label: string;
  tone?: Tone; // Farbe des Werts für das Band (dein Bereich)
};

const ROW = 30;
const LABEL_W = 96;
const VALUE_W = 70;
const MIN_N = 3;

// Vergleich nach Zyklusphase: Schnitt je Phase als Punkt auf einer gemeinsamen Skala, mit Zahl und Anzahl der Tage
export default function PhaseCompare({ means, range, ranges, fmt, label, tone = "recovery" }: Props) {
  const { ref, w: W } = useChartWidth();
  const vals = PHASE_GROUPS.map(([g]) => (means[g].n >= MIN_N ? means[g].mean : null));
  const own = ranges && PHASE_GROUPS.some(([g]) => ranges[g]);
  const rowRange = (g: PhaseGroup) => (own ? ranges?.[g] ?? null : null);
  const ext = extent(vals, range ? [range.lo, range.hi] : [], PHASE_GROUPS.flatMap(([g]) => (rowRange(g) ? [rowRange(g)!.lo, rowRange(g)!.hi] : [])));
  const pad = ext ? (ext[1] - ext[0]) * 0.25 || 1 : 1;
  const x = ext ? linear(ext[0] - pad, ext[1] + pad, LABEL_W + 6, W - VALUE_W - 6) : () => W / 2;
  const h = PHASE_GROUPS.length * ROW;
  const desc = PHASE_GROUPS.map(([g, l], i) => `${l} ${vals[i] === null ? "zu wenige Tage" : `${fmt(vals[i] as number)} aus ${means[g].n} Tagen`}${rowRange(g) ? `, Bereich ${fmt(rowRange(g)!.lo)} bis ${fmt(rowRange(g)!.hi)}` : ""}`).join(", ");

  return (
    <svg ref={ref} className={`cb cb-${tone}`} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`${label} nach Zyklusphase: ${desc}`}>
      {range && !own && <rect x={x(range.lo)} width={Math.max(2, x(range.hi) - x(range.lo))} y={2} height={h - 4} rx={6} className="cb-band" />}
      {PHASE_GROUPS.map(([g, l], i) => {
        const cy = i * ROW + ROW / 2;
        const v = vals[i];
        const rr = rowRange(g);
        return (
          <g key={g}>
            {rr && <rect x={x(rr.lo)} width={Math.max(2, x(rr.hi) - x(rr.lo))} y={cy - 9} height={18} rx={6} className="cb-band" />}
            <text x={0} y={cy + 4} className="cb-tick cb-tick-strong">{l}</text>
            <line x1={LABEL_W + 6} x2={W - VALUE_W - 6} y1={cy} y2={cy} className="cb-grid" />
            {v !== null && <circle cx={x(v)} cy={cy} r={6} className={`cb-dot cb-dot-${g}`} />}
            <text x={W} y={cy + 4} textAnchor="end" className={v === null ? "cb-tick" : "cb-value"}>
              {v === null ? "–" : fmt(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
