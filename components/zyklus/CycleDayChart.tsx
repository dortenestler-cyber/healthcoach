"use client";

import { extent, grownHeight, linear, niceTicks, segments, type Tone } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";

import { ChartTip, usePick } from "@/components/charts/pick";
import { PHASE_GROUP_LABEL } from "@/lib/cycle";
import type { ByCycleDay } from "@/lib/zyklusSeite";

const H0 = 170;
const PAD_L = 4;
const PAD_R = 52;
const PAD_T = 14;
const PAD_B = 22;

// Wert nach Zyklustag: laufender Zyklus (Farbe des Werts) über dem Schnitt der früheren Zyklen (grau).
// Phasen als Leiste unter der Achse, Antippen zeigt Zyklustag, Wert und Schnitt.
export default function CycleDayChart({ d, fmt, label, tone, zeroLine }: { d: ByCycleDay; fmt: (v: number) => string; label: string; tone: Tone; zeroLine?: boolean }) {
  const { ref, w: W } = useChartWidth();
  const H = grownHeight(H0, W);
  const n = d.length;
  const ext = extent(d.current, d.usual, zeroLine ? [0] : []);
  const ticks = ext ? niceTicks(ext[0], ext[1]) : [];
  const y = linear(ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1, H - PAD_B, PAD_T);
  const step = (W - PAD_L - PAD_R) / Math.max(1, n);
  const x = (i: number) => PAD_L + (i + 0.5) * step;
  const pts = (v: (number | null)[]) => segments(v.map((val, i) => (val === null ? null : { x: x(i), y: y(val) })));
  const last = [...d.current.keys()].reverse().find((i) => d.current[i] !== null);
  const lastV = last !== undefined ? (d.current[last] as number) : null;
  const pick = usePick(n, PAD_L, step, W);
  const sel = pick.sel;
  const runs: { p: (typeof d.phases)[number]; from: number; to: number }[] = [];
  d.phases.forEach((p, i) => {
    const r = runs[runs.length - 1];
    if (r && r.p === p) r.to = i;
    else runs.push({ p, from: i, to: i });
  });

  return (
    <svg ref={ref} className={`cb cb-${tone} cb-pickable`} viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={label} {...pick.handlers}>
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
      {runs.map((r) => {
        const xa = PAD_L + r.from * step + 1;
        const w = Math.max(2, (r.to - r.from + 1) * step - 2);
        return (
          <g key={r.from}>
            <rect x={xa} y={H + 4} width={w} height={14} rx={7} className={`cb-strip cb-strip-${r.p}`} />
            {w > 46 && <text x={xa + w / 2} y={H + 14.5} textAnchor="middle" className={`cb-strip-text cb-strip-text-${r.p}`}>{PHASE_GROUP_LABEL[r.p]}</text>}
          </g>
        );
      })}
      {sel !== null && (
        <g aria-hidden="true">
          <line x1={x(sel)} x2={x(sel)} y1={PAD_T - 6} y2={H - PAD_B} className="cb-pick-line" />
          {d.current[sel] !== null && <circle cx={x(sel)} cy={y(d.current[sel] as number)} r={5} className="cb-pick-dot" />}
          <ChartTip
            w={W}
            x={x(sel)}
            lines={[
              `Tag ${sel + 1} · ${d.current[sel] === null ? "kein Wert" : fmt(d.current[sel] as number)}`,
              `${PHASE_GROUP_LABEL[d.phases[sel]]}${d.usual[sel] !== null ? ` · Schnitt ${fmt(d.usual[sel] as number)}` : ""}`,
            ]}
          />
        </g>
      )}
    </svg>
  );
}
