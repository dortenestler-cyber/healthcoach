import { phaseFor, type Phase } from "@/lib/cycle";

// Vier Phasen für Ring, Symbole und Kalender (Konzept dunkel 2, Muster 8 und 9)
export type Phase4 = "menstruation" | "follikel" | "eisprung" | "luteal";
export const PHASE4: Phase4[] = ["menstruation", "follikel", "eisprung", "luteal"];
export const PHASE4_LABEL: Record<Phase4, string> = { menstruation: "Menstruation", follikel: "Follikel", eisprung: "Eisprung", luteal: "Luteal" };
export const phase4Of = (p: Phase | null): Phase4 | null => (p === null ? null : p === "luteal-frueh" || p === "luteal-spaet" ? "luteal" : p);

// Zusammenhängende Tage je Phase für eine Zykluslänge
export function arcs4(length: number): { phase: Phase4; from: number; to: number }[] {
  const out: { phase: Phase4; from: number; to: number }[] = [];
  for (let d = 1; d <= length; d++) {
    const p = phase4Of(phaseFor(d, length)) as Phase4;
    const last = out[out.length - 1];
    if (last && last.phase === p) last.to = d;
    else out.push({ phase: p, from: d, to: d });
  }
  return out;
}

// Symbol je Phase: Tropfen, Spross, Funke, Mond. Immer mit Wort daneben.
export function PhaseIcon({ phase, size = 18 }: { phase: Phase4; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (phase === "menstruation") return <svg {...common}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>;
  if (phase === "follikel") return <svg {...common}><path d="M12 21v-9" /><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z" /><path d="M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /></svg>;
  if (phase === "eisprung") return <svg {...common}><path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>;
  return <svg {...common}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
}

// Zyklus-Ring: vier Phasenbögen mit Lücken, heute als Punkt, Zyklustag groß in der Mitte. Nie ohne Zahl und Wort.
export default function CycleRing({ cycleDay, length, phase, size = 240 }: { cycleDay: number | null; length: number; phase: Phase4 | null; size?: number }) {
  const r = 100;
  const c = 2 * Math.PI * r;
  const per = c / length;
  const SW = 18;
  const GAP = 8;
  const dot = cycleDay !== null ? Math.min(cycleDay, length) : null;
  const angle = dot !== null ? ((dot - 0.5) / length) * 2 * Math.PI - Math.PI / 2 : 0;
  const label = cycleDay === null ? "Zyklustag unbekannt" : `Zyklustag ${cycleDay} von etwa ${length}${phase ? ", " + PHASE4_LABEL[phase] + " (geschätzt)" : ""}`;

  return (
    <div className="cycle-ring" style={{ width: size, height: size }}>
      <svg className="cb" width={size} height={size} viewBox="0 0 260 260" role="img" aria-label={label}>
        <g transform="rotate(-90 130 130)" fill="none">
          {arcs4(length).map((a) => {
            const len = Math.max(0.5, (a.to - a.from + 1) * per - SW - GAP);
            const start = (a.from - 1) * per + (SW + GAP) / 2;
            return <circle key={a.phase + a.from} cx={130} cy={130} r={r} strokeWidth={SW} strokeLinecap="round" className={`cyc4-${a.phase}`} style={{ strokeDasharray: `${len} ${c}`, strokeDashoffset: `${-start}` }} />;
          })}
        </g>
        {dot !== null && (
          <g>
            <circle cx={130 + r * Math.cos(angle)} cy={130 + r * Math.sin(angle)} r={15} className="cyc4-dot-ring" />
            <circle cx={130 + r * Math.cos(angle)} cy={130 + r * Math.sin(angle)} r={6} className="cyc4-dot" />
          </g>
        )}
      </svg>
      <div className="cycle-ring-center">
        {phase && <span className={`cyc4-text-${phase}`}><PhaseIcon phase={phase} size={24} /></span>}
        <span className="cycle-ring-day">{cycleDay === null ? "–" : `Tag ${cycleDay}`}</span>
        <span className="meta">von etwa {length}</span>
      </div>
    </div>
  );
}
