"use client";

// Zonen-Skala: waagrechte Skala mit benannten Zonen und einem Punkt für den heutigen Wert.
// Beispiel Belastungsverhältnis: unter 0,8 · 0,8–1,3 · über 1,3. Der Zielbereich ist hervorgehoben, jede Zone hat ihr Wort.

import { linear, type Tone } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";

export type Zone = { to: number; label: string; target?: boolean };

type Props = {
  value: number | null;
  min: number;
  max: number;
  zones: Zone[]; // aufsteigend, die letzte Zone endet bei max
  fmt: (v: number) => string;
  label: string;
  tone?: Tone;
};

const H = 58;
const BAR_Y = 20;
const BAR_H = 12;

export default function ZoneScale({ value, min, max, zones, fmt, label, tone = "training" }: Props) {
  const { ref, w: W } = useChartWidth();
  const x = linear(min, max, 8, W - 8);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  let from = min;
  const parts = zones.map((z) => {
    const p = { ...z, from, to: Math.min(z.to, max) };
    from = p.to;
    return p;
  });

  return (
    <svg ref={ref} className={`cb cb-${tone}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {parts.map((p, i) => (
        <g key={i}>
          <rect x={x(p.from) + (i ? 1 : 0)} width={Math.max(1, x(p.to) - x(p.from) - (i ? 1 : 0))} y={BAR_Y} height={BAR_H} className={p.target ? "cb-zone-target" : "cb-zone-off"} />
          <text x={(x(p.from) + x(p.to)) / 2} y={BAR_Y + BAR_H + 16} textAnchor="middle" className={p.target ? "cb-tick cb-tick-strong" : "cb-tick"}>
            {p.label}
          </text>
          {i > 0 && (
            <text x={x(p.from)} y={BAR_Y - 6} textAnchor="middle" className="cb-tick">
              {fmt(p.from)}
            </text>
          )}
        </g>
      ))}
      {value !== null && (
        <g>
          <circle cx={x(clamp(value))} cy={BAR_Y + BAR_H / 2} r={8} className="cb-dot" />
        </g>
      )}
    </svg>
  );
}
