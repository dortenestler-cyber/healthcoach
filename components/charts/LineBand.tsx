// Linie mit Band: Verlauf eines Werts, persönlicher Bereich als Band, Zyklusphasen getönt.
// Das Band ist entweder fest (Bereich heute) oder wandert mit (bands: Bereich, wie er an jedem Tag galt).
// Festes Seitenverhältnis, 2–3 beschriftete Hilfslinien (Zahl links über der Linie), letzter Wert als Zahl am Punkt.

import type { Range } from "@/lib/baseline";
import type { PhaseGroup } from "@/lib/cycle";
import { W, extent, linear, niceTicks, segments, type Tone } from "@/components/charts/scale";

type Props = {
  values: (number | null)[]; // ein Wert pro Tag, ältester zuerst
  fmt: (v: number) => string; // für den letzten Wert und die Hilfslinien
  label: string; // Beschreibung für Vorlesehilfen
  tone?: Tone;
  band?: Range | null; // 30-Tage-Bereich
  phaseBand?: Range | null; // Bereich der heutigen Zyklusphase, gestrichelt
  bands?: (Range | null)[]; // wandernder Bereich, ein Eintrag je Wert; ersetzt band und phaseBand
  phases?: (PhaseGroup | null)[]; // Hintergrund je Tag
  futureFrom?: number; // ab diesem Index geschätzt (heller)
  todayIndex?: number;
  zeroLine?: boolean; // Nulllinie, z. B. für die Temperatur-Abweichung
  xLabels?: { index: number; text: string }[];
  markers?: boolean[]; // Markierung oben am Tag, z. B. Nachtschweiß (Legende steht in der Karte)
  height?: number;
};

const PAD_L = 4;
const PAD_R = 52; // Platz für die Zahl am letzten Punkt
const PAD_T = 14;
const PAD_B = 22;

// Zusammenhängende Abschnitte mit Bereich, damit Lücken frei bleiben
function bandRuns(bands: (Range | null)[]): { i: number; r: Range }[][] {
  const runs: { i: number; r: Range }[][] = [];
  let cur: { i: number; r: Range }[] = [];
  bands.forEach((r, i) => {
    if (r) cur.push({ i, r });
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  });
  if (cur.length) runs.push(cur);
  return runs;
}

// Fläche als Treppe: jeder Tag bekommt seine volle Breite
function bandPath(run: { i: number; r: Range }[], x0: number, step: number, y: (v: number) => number): string {
  const top = run.flatMap(({ i, r }) => [`${x0 + i * step},${y(r.hi)}`, `${x0 + (i + 1) * step},${y(r.hi)}`]);
  const bottom = [...run].reverse().flatMap(({ i, r }) => [`${x0 + (i + 1) * step},${y(r.lo)}`, `${x0 + i * step},${y(r.lo)}`]);
  return `M${[...top, ...bottom].join("L")}Z`;
}

export default function LineBand({ values, fmt, label, tone = "recovery", band, phaseBand, bands, phases, futureFrom, todayIndex, zeroLine, xLabels = [], markers, height = 170 }: Props) {
  const n = Math.max(values.length, 1);
  const moving = bands?.some(Boolean) ? bands : undefined;
  const fixed = moving ? null : band;
  const fixedPhase = moving ? null : phaseBand;
  const bandVals = moving ? moving.flatMap((b) => (b ? [b.lo, b.hi] : [])) : [];
  const ext = extent(values, fixed ? [fixed.lo, fixed.hi] : [], fixedPhase ? [fixedPhase.lo, fixedPhase.hi] : [], bandVals, zeroLine ? [0] : []);
  const ticks = ext ? niceTicks(ext[0], ext[1]) : [];
  const d0 = ticks[0] ?? 0;
  const d1 = ticks[ticks.length - 1] ?? 1;
  const x0 = PAD_L;
  const x1 = W - PAD_R;
  const step = (x1 - x0) / n;
  const x = (i: number) => x0 + (i + 0.5) * step;
  const y = linear(d0, d1, height - PAD_B, PAD_T);

  const pts = values.map((v, i) => (v === null ? null : { x: x(i), y: y(v) }));
  const last = [...values.keys()].reverse().find((i) => values[i] !== null && (futureFrom === undefined || i < futureFrom));
  const lastV = last !== undefined ? (values[last] as number) : null;

  return (
    <svg className={`cb cb-${tone}`} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      {phases?.map((p, i) => (p ? <rect key={i} x={x0 + i * step} y={PAD_T - 6} width={step + 0.3} height={height - PAD_B - PAD_T + 6} className={`cb-ph-${p}`} /> : null))}
      {fixed && <rect x={x0} width={x1 - x0} y={y(fixed.hi)} height={Math.max(1, y(fixed.lo) - y(fixed.hi))} className="cb-band" />}
      {fixedPhase && <rect x={x0} width={x1 - x0} y={y(fixedPhase.hi)} height={Math.max(1, y(fixedPhase.lo) - y(fixedPhase.hi))} className="cb-band-luteal" />}
      {moving && bandRuns(moving).map((run, i) => (
        <path key={`b${i}`} d={bandPath(run, x0, step, y)} className="cb-band" />
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} className={zeroLine && t === 0 ? "cb-zero" : "cb-grid"} />
          <text x={x0 + 2} y={y(t) - 3} className="cb-tick">
            {fmt(t)}
          </text>
        </g>
      ))}
      {futureFrom !== undefined && futureFrom < n && <rect x={x0 + futureFrom * step} y={PAD_T - 6} width={(n - futureFrom) * step} height={height - PAD_B - PAD_T + 6} className="cb-future" />}
      {todayIndex !== undefined && <line x1={x(todayIndex)} x2={x(todayIndex)} y1={PAD_T - 6} y2={height - PAD_B} className="cb-today" />}
      {segments(pts).map((s, i) => (
        <polyline key={i} points={s} className="cb-line" />
      ))}
      {markers?.map((m, i) => (m ? <circle key={`m${i}`} cx={x(i)} cy={PAD_T - 8} r={3} className="cb-marker" /> : null))}
      {last !== undefined && lastV !== null && (
        <g>
          <circle cx={x(last)} cy={y(lastV)} r={4.5} className="cb-dot" />
          <text x={x(last) + 8} y={y(lastV) - 8} className="cb-value">
            {fmt(lastV)}
          </text>
        </g>
      )}
      {xLabels.map((l) => (
        <text key={l.index} x={x(l.index)} y={height - 6} textAnchor={l.index === 0 ? "start" : l.index >= n - 1 ? "end" : "middle"} className="cb-tick">
          {l.text}
        </text>
      ))}
    </svg>
  );
}
