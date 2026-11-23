"use client";

// Linie mit Band: Verlauf eines Werts, persönlicher Bereich als Band.
// Zyklusphasen als schmale Leiste unter der Zeitachse (Sammelliste Punkt 8), Periodenbeginn als feine Linie mit Tropfen.
// Antippen oder Überfahren zeigt Datum und Wert (Punkt 9).
// Das Band ist entweder fest (Bereich heute) oder wandert mit (bands: Bereich, wie er an jedem Tag galt).
// Zeichnet in echter Breite (Punkt 15), 2–3 beschriftete Hilfslinien (Zahl links über der Linie), letzter Wert als Zahl am Punkt.

import type { Range } from "@/lib/baseline";
import { PHASE_GROUP_LABEL, type PhaseGroup } from "@/lib/cycle";
import { extent, grownHeight, linear, niceTicks, segments, smoothBand, type Tone } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";
import { ChartTip, tipDate, usePick, type SharedPick } from "@/components/charts/pick";

type Props = {
  values: (number | null)[]; // ein Wert pro Tag, ältester zuerst
  fmt: (v: number) => string; // für den letzten Wert und die Hilfslinien
  label: string; // Beschreibung für Vorlesehilfen
  tone?: Tone;
  band?: Range | null; // 30-Tage-Bereich
  phaseBand?: Range | null; // Bereich der heutigen Zyklusphase, gestrichelt
  bands?: (Range | null)[]; // wandernder Bereich, ein Eintrag je Wert; ersetzt band und phaseBand
  phases?: (PhaseGroup | null)[]; // Phase je Tag, als Leiste unter der Achse
  dates?: string[]; // Datum je Wert (für das Schild beim Antippen)
  tipNote?: (i: number) => string | null; // eigene zweite Zeile im Schild
  futureFrom?: number; // ab diesem Index geschätzt (heller)
  todayIndex?: number;
  zeroLine?: boolean; // Nulllinie, z. B. für Abweichungen vom Normalwert
  xLabels?: { index: number; text: string }[];
  markers?: boolean[]; // Markierung oben am Tag, z. B. Nachtschweiß (Legende steht in der Karte)
  height?: number;
  shared?: SharedPick; // gemeinsamer Tag mehrerer Charts
};

const PAD_L = 4;
const PAD_R = 52; // Platz für die Zahl am letzten Punkt
const PAD_T = 14;
const PAD_B = 22;
const STRIP = 24; // Höhe der Phasenleiste samt Abstand
const SHORT: Record<PhaseGroup, string> = { menstruation: "Mens.", follikel: "Follikel", eisprung: "Eispr.", luteal: "Luteal" };

// Zusammenhängende Abschnitte gleicher Phase
function phaseRuns(phases: (PhaseGroup | null)[]): { p: PhaseGroup; from: number; to: number }[] {
  const out: { p: PhaseGroup; from: number; to: number }[] = [];
  phases.forEach((p, i) => {
    const last = out[out.length - 1];
    if (!p) return;
    if (last && last.p === p && last.to === i - 1) last.to = i;
    else out.push({ p, from: i, to: i });
  });
  return out;
}

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

// Fläche als weiche Kurve durch die Tagesmitten (Sammelliste Punkt 17), an den Enden volle Tagesbreite
function bandPath(run: { i: number; r: Range }[], x0: number, step: number, y: (v: number) => number): string {
  const xs = run.map(({ i }) => x0 + (i + 0.5) * step);
  return smoothBand(xs, run.map(({ r }) => y(r.hi)), run.map(({ r }) => y(r.lo)), step / 2);
}

export default function LineBand({ values, fmt, label, tone = "recovery", band, phaseBand, bands, phases, dates, tipNote, futureFrom, todayIndex, zeroLine, xLabels = [], markers, height: baseHeight = 170, shared }: Props) {
  const { ref, w } = useChartWidth();
  const height = grownHeight(baseHeight, w);
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
  // Platz rechts nach der Länge der letzten Zahl, damit z. B. „−0,2 °C“ nicht abgeschnitten wird
  const lastIdx = [...values.keys()].reverse().find((i) => values[i] !== null && (futureFrom === undefined || i < futureFrom));
  const padR = Math.max(PAD_R, lastIdx === undefined ? 0 : fmt(values[lastIdx] as number).length * 7.6 + 14);
  const x1 = w - padR;
  const step = (x1 - x0) / n;
  const x = (i: number) => x0 + (i + 0.5) * step;
  const y = linear(d0, d1, height - PAD_B, PAD_T);

  const pts = values.map((v, i) => (v === null ? null : { x: x(i), y: y(v) }));
  const last = [...values.keys()].reverse().find((i) => values[i] !== null && (futureFrom === undefined || i < futureFrom));
  const lastV = last !== undefined ? (values[last] as number) : null;
  const hasStrip = !!phases?.some(Boolean);
  const total = height + (hasStrip ? STRIP : 0);
  const pick = usePick(n, x0, step, w, shared);
  const sel = pick.sel;

  // Zweite Zeile im Schild: Lage zum Bereich und Phase
  const note = (i: number): string => {
    const own = tipNote?.(i);
    if (own) return own;
    const v = values[i];
    const r = moving ? moving[i] : fixed;
    const parts: string[] = [];
    if (v !== null && r) parts.push(v < r.lo ? "unter deinem Bereich" : v > r.hi ? "über deinem Bereich" : "im Bereich");
    const p = phases?.[i];
    if (p) parts.push(PHASE_GROUP_LABEL[p] + (futureFrom !== undefined && i >= futureFrom ? " (geschätzt)" : ""));
    return parts.join(" · ");
  };

  return (
    <svg ref={ref} className={`cb cb-${tone} cb-pickable`} viewBox={`0 0 ${w} ${total}`} role="img" aria-label={label} {...pick.handlers}>
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
      {phases?.map((p, i) =>
        p === "menstruation" && phases[i - 1] !== "menstruation" && i > 0 ? (
          <g key={`ps${i}`} className="cb-period-start">
            <line x1={x0 + i * step} x2={x0 + i * step} y1={PAD_T} y2={height - PAD_B} />
            <path d={`M${x0 + i * step} ${PAD_T - 9}c0 0 3.6 4 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-2.4 3.6-6.4 3.6-6.4z`} />
          </g>
        ) : null,
      )}
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
      {hasStrip &&
        phaseRuns(phases!).map((r) => {
          const xa = x0 + r.from * step + 1;
          const w = Math.max(2, (r.to - r.from + 1) * step - 2);
          const est = futureFrom !== undefined && r.from >= futureFrom;
          const text = w > 46 ? PHASE_GROUP_LABEL[r.p] : w > 34 ? SHORT[r.p] : "";
          return (
            <g key={`s${r.from}`}>
              <rect x={xa} y={height + 4} width={w} height={14} rx={7} className={`cb-strip cb-strip-${r.p}`} data-est={est} />
              {text && (
                <text x={xa + w / 2} y={height + 14.5} textAnchor="middle" className={`cb-strip-text cb-strip-text-${r.p}`}>
                  {text}
                </text>
              )}
            </g>
          );
        })}
      {sel !== null && (
        <g aria-hidden="true">
          <line x1={x(sel)} x2={x(sel)} y1={PAD_T - 6} y2={height - PAD_B} className="cb-pick-line" />
          {values[sel] !== null && <circle cx={x(sel)} cy={y(values[sel] as number)} r={5} className="cb-pick-dot" />}
          <ChartTip
            w={w}
            x={x(sel)}
            lines={[`${dates?.[sel] ? tipDate(dates[sel]) + " · " : ""}${values[sel] === null ? "kein Wert" : fmt(values[sel] as number)}`, note(sel)].filter(Boolean) as string[]}
          />
        </g>
      )}
    </svg>
  );
}
