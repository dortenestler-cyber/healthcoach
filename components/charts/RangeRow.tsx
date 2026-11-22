// Bereichszeile: Name, heutiger Wert und Einordnung in Worten, darunter eine Spur mit dem eigenen Bereich und einem Punkt.
// In der Lutealphase stehen beide Bereiche da: der Luteal-Bereich (gilt heute) und der 30-Tage-Bereich.

import { NO_RANGE_TEXT, positionIn, positionText, type Range } from "@/lib/baseline";
import { W, extent, linear, type Tone } from "@/components/charts/scale";

type Props = {
  label: string;
  value: number | null;
  fmt: (v: number) => string;
  range: Range | null; // 30-Tage-Bereich
  luteal?: Range | null; // Luteal-Bereich, nur in der Lutealphase
  tone?: Tone;
};

const H = 26;

export default function RangeRow({ label, value, fmt, range, luteal, tone = "recovery" }: Props) {
  const active = luteal ?? range;
  const pos = value !== null && active ? positionIn(value, active) : null;
  const ext = extent([value], range ? [range.lo, range.hi] : [], luteal ? [luteal.lo, luteal.hi] : []);
  let x: (v: number) => number = () => W / 2;
  if (ext) {
    const pad = (ext[1] - ext[0]) * 0.35 || Math.abs(ext[0]) * 0.1 || 1;
    x = linear(ext[0] - pad, ext[1] + pad, 7, W - 7);
  }
  const rangeText = active ? `${luteal ? "Luteal" : "Bereich"} ${fmt(active.lo)}–${fmt(active.hi)}` : NO_RANGE_TEXT;

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
        <svg className="cb" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line x1={7} x2={W - 7} y1={H / 2} y2={H / 2} className="cb-track" />
          {range && luteal && <rect x={x(range.lo)} width={Math.max(2, x(range.hi) - x(range.lo))} y={H / 2 - 5} height={10} rx={5} className="cb-range-ghost" />}
          <rect x={x(active.lo)} width={Math.max(2, x(active.hi) - x(active.lo))} y={H / 2 - 5} height={10} rx={5} className={luteal ? "cb-range-luteal" : "cb-range"} />
          {value !== null && <circle cx={x(value)} cy={H / 2} r={6.5} className="cb-dot" />}
        </svg>
      )}
      {range && luteal && (
        <div className="range-row-meta">
          <span />
          <span>30 Tage {fmt(range.lo)}–{fmt(range.hi)}</span>
        </div>
      )}
    </div>
  );
}
