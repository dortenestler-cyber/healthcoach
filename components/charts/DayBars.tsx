// Tagessäulen: ein Wert pro Tag, optional mit persönlichem Bereich, Ziellinie oder Zielkorridor.
// Markierung (z. B. Nachtschweiß) als Punkt über der Säule, immer mit Legende im Text darunter.

import type { Range } from "@/lib/baseline";
import { W, extent, linear, niceTicks, type Tone } from "@/components/charts/scale";

export type Bar = { label: string; value: number | null; today?: boolean; marker?: boolean };

type Props = {
  bars: Bar[];
  fmt: (v: number) => string;
  label: string;
  tone?: Tone;
  band?: Range | null; // persönlicher Bereich
  corridor?: { lo: number; hi: number } | null; // Zielkorridor, z. B. Wochenlast
  target?: number | null; // Ziellinie, z. B. Schlafziel
  targetLabel?: string;
  markerLabel?: string; // Text für die Markierung in der Legende
  height?: number;
};

const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 18;
const PAD_B = 22;

export default function DayBars({ bars, fmt, label, tone = "training", band, corridor, target, targetLabel, markerLabel, height = 160 }: Props) {
  const n = Math.max(bars.length, 1);
  const ext = extent(
    bars.map((b) => b.value),
    [0],
    band ? [band.lo, band.hi] : [],
    corridor ? [corridor.lo, corridor.hi] : [],
    target != null ? [target] : [],
  );
  const ticks = ext ? niceTicks(Math.min(0, ext[0]), ext[1]) : [0, 1];
  const d1 = ticks[ticks.length - 1] || 1;
  const x0 = PAD_L;
  const x1 = W - PAD_R;
  const step = (x1 - x0) / n;
  const bw = Math.min(28, step * 0.62);
  const y = linear(0, d1, height - PAD_B, PAD_T);
  const hasMarker = bars.some((b) => b.marker);

  return (
    <figure className={`cb-figure cb-${tone}`}>
      <svg className="cb" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} className="cb-grid" />
            {t !== 0 && (
              <text x={x0 + 2} y={y(t) - 3} className="cb-tick">
                {fmt(t)}
              </text>
            )}
          </g>
        ))}
        {corridor && <rect x={x0} width={x1 - x0} y={y(corridor.hi)} height={Math.max(1, y(corridor.lo) - y(corridor.hi))} className="cb-zone" />}
        {band && <rect x={x0} width={x1 - x0} y={y(band.hi)} height={Math.max(1, y(band.lo) - y(band.hi))} className="cb-band" />}
        {bars.map((b, i) => {
          const cx = x0 + (i + 0.5) * step;
          const v = b.value;
          return (
            <g key={i}>
              {v !== null && v > 0 && <rect x={cx - bw / 2} width={bw} y={y(v)} height={y(0) - y(v)} rx={Math.min(6, bw / 3)} className={b.today ? "cb-bar cb-bar-today" : "cb-bar"} />}
              {v === null && <rect x={cx - bw / 2} width={bw} y={y(0) - 2} height={2} className="cb-bar-empty" />}
              {b.marker && <circle cx={cx} cy={(v !== null ? y(v) : y(0)) - 8} r={3.5} className="cb-marker" />}
              <text x={cx} y={height - 6} textAnchor="middle" className={b.today ? "cb-tick cb-tick-strong" : "cb-tick"}>
                {b.label}
              </text>
            </g>
          );
        })}
        {target != null && (
          <g>
            <line x1={x0} x2={x1} y1={y(target)} y2={y(target)} className="cb-target" />
            {targetLabel && (
              <text x={x1 - 2} y={y(target) - 4} textAnchor="end" className="cb-tick cb-tick-strong">
                {targetLabel}
              </text>
            )}
          </g>
        )}
      </svg>
      {(band || corridor || (hasMarker && markerLabel)) && (
        <figcaption className="cb-legend">
          {band && (
            <span>
              <i className="cb-key-band" />
              Dein Bereich {fmt(band.lo)}–{fmt(band.hi)}
            </span>
          )}
          {corridor && (
            <span>
              <i className="cb-key-zone" />
              Ziel {fmt(corridor.lo)}–{fmt(corridor.hi)}
            </span>
          )}
          {hasMarker && markerLabel && (
            <span>
              <i className="cb-key-marker" />
              {markerLabel}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
