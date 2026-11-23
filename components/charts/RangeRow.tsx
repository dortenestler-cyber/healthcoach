"use client";

// Bereichszeile: Name, heutiger Wert und Einordnung in Worten, darunter eine Spur mit dem eigenen Bereich und einem Punkt.
// Gibt es einen Bereich der heutigen Zyklusphase, stehen beide da: der Phasen-Bereich (gilt heute) und der 30-Tage-Bereich.
// Ein vorläufiger Bereich (unter 14 Tagen) ist als solcher benannt.

import { NO_RANGE_TEXT, positionIn, positionText, type Range } from "@/lib/baseline";
import { extent, linear, type Tone } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";

type Props = {
  label: string;
  value: number | null;
  fmt: (v: number) => string;
  range: Range | null; // 30-Tage-Bereich
  phase?: Range | null; // Bereich der heutigen Zyklusphase
  phaseName?: string; // z. B. „Lutealphase“
  tone?: Tone;
};

const H = 26;

export default function RangeRow({ label, value, fmt, range, phase, phaseName = "Phase", tone = "recovery" }: Props) {
  const { ref, w: W } = useChartWidth();
  const active = phase ?? range;
  const pos = value !== null && active ? positionIn(value, active) : null;
  const ext = extent([value], range ? [range.lo, range.hi] : [], phase ? [phase.lo, phase.hi] : []);
  let x: (v: number) => number = () => W / 2;
  if (ext) {
    const pad = (ext[1] - ext[0]) * 0.35 || Math.abs(ext[0]) * 0.1 || 1;
    x = linear(ext[0] - pad, ext[1] + pad, 7, W - 7);
  }
  const rangeText = active ? `${phase ? phaseName : "Bereich"} ${fmt(active.lo)}–${fmt(active.hi)}${active.stable ? "" : " · vorläufig"}` : NO_RANGE_TEXT;

  return (
    <div className={`range-row cb-${tone}`}>
      <div className="range-row-head">
        <span className="range-row-label">{label}</span>
        <span className="range-row-value">{value !== null ? fmt(value) : "–"}</span>
      </div>
      <div className="range-row-meta">
        <span>{pos ? positionText(pos) : value === null ? "kein Wert heute" : ""}</span>
        <span>{rangeText}</span>
      </div>
      {active && (
        <svg ref={ref} className="cb" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line x1={7} x2={W - 7} y1={H / 2} y2={H / 2} className="cb-track" />
          {range && phase && <rect x={x(range.lo)} width={Math.max(2, x(range.hi) - x(range.lo))} y={H / 2 - 5} height={10} rx={5} className="cb-range-ghost" />}
          <rect x={x(active.lo)} width={Math.max(2, x(active.hi) - x(active.lo))} y={H / 2 - 5} height={10} rx={5} className={phase ? "cb-range-luteal" : "cb-range"} />
          {value !== null && <circle cx={x(value)} cy={H / 2} r={6.5} className="cb-dot" />}
        </svg>
      )}
      {range && phase && (
        <div className="range-row-meta">
          <span />
          <span>30 Tage {fmt(range.lo)}–{fmt(range.hi)}</span>
        </div>
      )}
    </div>
  );
}
