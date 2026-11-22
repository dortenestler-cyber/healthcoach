import { extent, linear, niceTicks, segments, W, type Tone } from "@/components/charts/scale";
import type { ByCycleDay } from "@/lib/zyklusSeite";

const H = 170;
const PAD_L = 4;
const PAD_R = 52;
const PAD_T = 14;
const PAD_B = 22;

// Wert nach Zyklustag: laufender Zyklus (Farbe des Werts) über dem Schnitt der früheren Zyklen (grau), Phasen getönt.
export default function CycleDayChart({ d, fmt, label, tone, zeroLine }: { d: ByCycleDay; fmt: (v: number) => string; label: string; tone: Tone; zeroLine?: boolean }) {
  const n = d.length;
  const ext = extent(d.current, d.usual, zeroLine ? [0] : []);
  const ticks = ext ? niceTicks(ext[0], ext[1]) : [];
  const y = linear(ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1, H - PAD_B, PAD_T);
  const step = (W - PAD_L - PAD_R) / Math.max(1, n);
  const x = (i: number) => PAD_L + (i + 0.5) * step;
  const pts = (v: (number | null)[]) => segments(v.map((val, i) => (val === null ? null : { x: x(i), y: y(val) })));
  const last = [...d.current.keys()].reverse().find((i) => d.current[i] !== null);
  const lastV = last !== undefined ? (d.current[last] as number) : null;

  return (
    <svg className={`cb cb-${tone}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {d.phases.map((p, i) => <rect key={i} x={PAD_L + i * step} y={PAD_T - 6} width={step + 0.3} height={H - PAD_T - PAD_B + 6} className={`cb-ph-${p}`} />)}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className={zeroLine && t === 0 ? "cb-zero" : "cb-grid"} />
          <text x={PAD_L + 2} y={y(t) - 3} className="cb-tick">{fmt(t)}</text>
        </g>
      ))}
      {d.todayIndex !== null && <line x1={x(d.todayIndex)} x2={x(d.todayIndex)} y1={PAD_T - 6} y2={H - PAD_B} className="cb-today" />}
      {pts(d.usual).map((s, i) => <polyline key={`u${i}`} points={s} className="cb-line-usual" />)}
      {pts(d.current).map((s, i) => <polyline key={`c${i}`} points={s} className="cb-line" />)}
      {last !== undefined && lastV !== null && (
        <g>
          <circle cx={x(last)} cy={y(lastV)} r={4.5} className="cb-dot" />
          <text x={x(last) + 8} y={y(lastV) - 8} className="cb-value">{fmt(lastV)}</text>
        </g>
      )}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="cb-tick">Tag {i + 1}</text>
      ))}
    </svg>
  );
}
