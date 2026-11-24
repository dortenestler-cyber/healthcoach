// Ring für Schlaf, Readiness und Belastung: Fortschritt als Bogen, optional mit Zielbogen außen.
// Die Zahl steht in der Mitte, das Wort darunter. Farbe nie allein.

import { type Tone } from "@/components/charts/scale";

type Props = {
  value: number; // 0–1 (über 1 wird voll gezeichnet)
  split?: number | null; // 0–1: so viel vom Wert ist der kräftige Teil (Training), der Rest ist hell (Alltag)
  target?: { lo: number; hi: number } | null; // Zielbogen 0–1, z. B. Belastungsziel
  center: string; // große Zahl
  caption: string; // Wort darunter
  label: string; // für Vorlesehilfen
  tone?: Tone;
  size?: number;
};

export default function ValueRing({ value, split, target, center, caption, label, tone = "recovery", size = 104 }: Props) {
  const r = 42; // schmaler Strich (5 von 104), dezent
  const c = 2 * Math.PI * r;
  const tr = 48; // Zielbogen außen
  const tc = 2 * Math.PI * tr;
  const v = Math.max(0, Math.min(1, value));
  target = target ? { lo: Math.min(target.lo, 0.99), hi: Math.min(target.hi, 1) } : target; // Ziel über 100 % endet am Ringende
  const arc = (len: number, total: number, from = 0) => ({ strokeDasharray: `${len * total} ${total}`, strokeDashoffset: `${-from * total}` });

  return (
    <svg className={`cb cb-ring cb-${tone}`} width={size} height={size} viewBox="0 0 104 104" role="img" aria-label={label}>
      <g transform="rotate(-90 52 52)" fill="none">
        <circle cx={52} cy={52} r={r} strokeWidth={5} className="cb-ring-track" />
        {v > 0 && split != null && split < v && <circle cx={52} cy={52} r={r} strokeWidth={5} strokeLinecap="round" className="cb-ring-value-alltag" style={arc(Math.max(v, 0.01), c)} />}
        {v > 0 && (split == null || split > 0) && <circle cx={52} cy={52} r={r} strokeWidth={5} strokeLinecap="round" className="cb-ring-value" style={arc(Math.max(split == null ? v : Math.min(split, v), 0.01), c)} />}
        {target && <circle cx={52} cy={52} r={tr} strokeWidth={2} strokeLinecap="round" className="cb-ring-target" style={arc(Math.max(0.01, target.hi - target.lo), tc, target.lo)} />}
      </g>
      <text x={52} y={55} textAnchor="middle" className="cb-ring-center">
        {center}
      </text>
      <text x={52} y={70} textAnchor="middle" className="cb-ring-caption">
        {caption}
      </text>
    </svg>
  );
}
