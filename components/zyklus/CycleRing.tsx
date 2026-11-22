import type { PhaseGroup } from "@/lib/cycle";
import { ringArcs } from "@/lib/zyklusSeite";

const GROUP_LABEL: Record<PhaseGroup, string> = { menstruation: "Menstruation", follikel: "Follikel", luteal: "Luteal" };

// Zyklus-Ring: Phasen als Bögen, heute als Punkt, Zyklustag groß in der Mitte. Nie ohne Zahl und Wort.
export default function CycleRing({ cycleDay, length, phaseLabel, size = 168 }: { cycleDay: number | null; length: number; phaseLabel: string; size?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const gap = 0.6; // Lücke zwischen den Bögen in Tagen
  const arcs = ringArcs(length);
  const angle = (d: number) => ((d - 1) / length) * 2 * Math.PI - Math.PI / 2;
  const dot = cycleDay !== null ? Math.min(cycleDay, length) : null;
  const label = cycleDay === null ? "Zyklustag unbekannt" : `Zyklustag ${cycleDay} von etwa ${length}, ${phaseLabel}`;

  return (
    <svg className="cb cb-ring cb-cycle" width={size} height={size} viewBox="0 0 104 104" role="img" aria-label={label}>
      <g transform="rotate(-90 52 52)" fill="none">
        {arcs.map((a) => {
          const len = ((a.to - a.from + 1 - gap) / length) * c;
          const off = ((a.from - 1) / length) * c;
          return <circle key={a.group + a.from} cx={52} cy={52} r={r} strokeWidth={8} className={`cycle-arc-${a.group}`} style={{ strokeDasharray: `${Math.max(0.5, len)} ${c}`, strokeDashoffset: `${-off}` }} />;
        })}
      </g>
      {dot !== null && <circle cx={52 + r * Math.cos(angle(dot + 0.5))} cy={52 + r * Math.sin(angle(dot + 0.5))} r={6} className="cycle-today" />}
      <text x={52} y={38} textAnchor="middle" className="cb-ring-caption">Zyklustag</text>
      <text x={52} y={60} textAnchor="middle" className="cb-ring-center">{cycleDay ?? "–"}</text>
      <text x={52} y={73} textAnchor="middle" className="cb-ring-caption">von etwa {length}</text>
    </svg>
  );
}

export const groupLabel = (g: PhaseGroup) => GROUP_LABEL[g];
