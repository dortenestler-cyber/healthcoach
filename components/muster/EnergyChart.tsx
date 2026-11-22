import { segments, W } from "@/components/charts/scale";
import type { EnergyDay } from "@/lib/muster";

const H = 190;
const PAD_L = 4;
const PAD_R = 40;
const PAD_T = 18;
const PAD_B = 22;

// Energie über den Tag: heutige Body Battery, üblicher Tag, Hochrechnung, Schlaf und Training als Flächen.
// Feste Achse 0–100, 0 bis 24 Uhr.
export default function EnergyChart({ e, label }: { e: EnergyDay; label: string }) {
  const x = (min: number) => PAD_L + (Math.max(0, Math.min(1440, min)) / 1440) * (W - PAD_L - PAD_R);
  const xs = (slot: number) => x(slot * 15 + 7.5);
  const y = (v: number) => PAD_T + (1 - v / 100) * (H - PAD_T - PAD_B);
  const line = (vals: (number | null)[]) => segments(vals.map((v, i) => (v === null ? null : { x: xs(i), y: y(v) })));
  const lastIdx = [...e.today.keys()].reverse().find((i) => e.today[i] !== null);
  const lastV = lastIdx !== undefined ? (e.today[lastIdx] as number) : null;
  const projEnd = [...e.projection.keys()].reverse().find((i) => e.projection[i] !== null);

  return (
    <figure className="cb-figure cb-recovery">
      <svg className="cb" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {e.sleep && (
          <g>
            <rect x={x(e.sleep.start)} width={Math.max(1, x(e.sleep.end) - x(e.sleep.start))} y={PAD_T - 6} height={H - PAD_T - PAD_B + 6} className="cb-sleep-area" />
            <text x={(x(e.sleep.start) + x(e.sleep.end)) / 2} y={PAD_T - 8} textAnchor="middle" className="cb-tick">Schlaf</text>
          </g>
        )}
        {e.training.map((t, i) => (
          <g key={i}>
            <rect x={x(t.start)} width={Math.max(2, x(t.end) - x(t.start))} y={PAD_T - 6} height={H - PAD_T - PAD_B + 6} className="cb-training-area" />
            <text x={(x(t.start) + x(t.end)) / 2} y={PAD_T - 8} textAnchor="middle" className="cb-tick">Training</text>
          </g>
        ))}
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="cb-grid" />
            <text x={PAD_L + 2} y={t === 100 ? y(t) + 12 : y(t) - 3} className="cb-tick">{t}</text>
          </g>
        ))}
        {line(e.usual).map((s, i) => <polyline key={`u${i}`} points={s} className="cb-line-usual" />)}
        {line(e.projection).map((s, i) => <polyline key={`p${i}`} points={s} className="cb-line cb-line-projection" />)}
        {line(e.today).map((s, i) => <polyline key={`t${i}`} points={s} className="cb-line" />)}
        {lastIdx !== undefined && lastV !== null && (
          <g>
            <circle cx={xs(lastIdx)} cy={y(lastV)} r={4.5} className="cb-dot" />
            <text x={xs(lastIdx) + 8} y={y(lastV) - 8} className="cb-value">{lastV}</text>
          </g>
        )}
        {projEnd !== undefined && projEnd > (lastIdx ?? 0) && (
          <text x={xs(projEnd) + 4} y={y(e.projection[projEnd] as number) + 4} className="cb-tick">≈ {Math.round(e.projection[projEnd] as number)}</text>
        )}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={x(h * 60)} y={H - 6} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} className="cb-tick">
            {h} Uhr
          </text>
        ))}
        <line x1={xs(e.nowSlot)} x2={xs(e.nowSlot)} y1={PAD_T - 6} y2={H - PAD_B} className="cb-today" />
      </svg>
      <figcaption className="cb-legend">
        <span><i className="cb-key-line" />Heute</span>
        <span><i className="cb-key-projection" />Hochrechnung</span>
        <span><i className="cb-key-usual" />Dein üblicher Tag</span>
        {e.sleep && <span><i className="cb-key-sleep-area" />Schlaf</span>}
        {e.training.length > 0 && <span><i className="cb-key-zone" />Training</span>}
      </figcaption>
    </figure>
  );
}

