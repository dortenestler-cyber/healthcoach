// Halbbogen mit Zielbereich (Konzept dunkel 2, Muster 2): Fortschritt als Bogen, Zielbereich als dünner Bogen außen.
// Zahl und Wort stehen in der Mitte, Farbe nie allein.

import { type Tone } from "@/components/charts/scale";

type Props = {
  value: number; // 0–1
  split?: number | null; // 0–1: kräftiger Teil (Training), der Rest hell (Alltag)
  target?: { lo: number; hi: number } | null; // 0–1
  center: string;
  caption: string;
  label: string;
  tone?: Tone;
};

const R = 100;
const RT = 114;
const CX = 130;
const CY = 128;
const LEN = Math.PI * R;
const TLEN = Math.PI * RT;
const arc = (r: number) => `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;

export default function HalfGauge({ value, split, target, center, caption, label, tone = "training" }: Props) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg className={`cb cb-gauge cb-${tone}`} viewBox="0 0 260 150" role="img" aria-label={label}>
      {target && (
        <path d={arc(RT)} fill="none" strokeWidth={4} strokeLinecap="round" className="cb-gauge-target" style={{ strokeDasharray: `0 ${target.lo * TLEN} ${Math.max(0.01, target.hi - target.lo) * TLEN} ${TLEN * 2}` }} />
      )}
      <path d={arc(R)} fill="none" strokeWidth={14} strokeLinecap="round" className="cb-ring-track" />
      {v > 0 && split != null && split < v && <path d={arc(R)} fill="none" strokeWidth={14} strokeLinecap="round" className="cb-ring-value-alltag" style={{ strokeDasharray: `${Math.max(0.01, v) * LEN} ${LEN * 2}` }} />}
      {v > 0 && (split == null || split > 0) && <path d={arc(R)} fill="none" strokeWidth={14} strokeLinecap="round" className="cb-ring-value" style={{ strokeDasharray: `${Math.max(0.01, split == null ? v : Math.min(split, v)) * LEN} ${LEN * 2}` }} />}
      <text x={CX} y={104} textAnchor="middle" className="cb-gauge-center">{center}</text>
      <text x={CX} y={128} textAnchor="middle" className="cb-gauge-caption">{caption}</text>
    </svg>
  );
}
