"use client";

// Schlafphasen-Balken: Anteile von Tief-, REM-, Leichtschlaf und Wachzeit in einer Nacht.
// Schlaf hat keine eigene Bedeutungsfarbe: Abstufungen von neutral, jede Phase mit Wort und Dauer darunter.

import { useChartWidth } from "@/components/charts/useChartWidth";

export type SleepStage = "tief" | "rem" | "leicht" | "wach";
export const STAGE_LABEL: Record<SleepStage, string> = { tief: "Tief", rem: "REM", leicht: "Leicht", wach: "Wach" };
const ORDER: SleepStage[] = ["tief", "rem", "leicht", "wach"];

export const hm = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};

const H = 20;

export default function SleepStagesBar({ minutes }: { minutes: Partial<Record<SleepStage, number>> }) {
  const stages = ORDER.filter((s) => (minutes[s] ?? 0) > 0);
  const total = stages.reduce((a, s) => a + (minutes[s] ?? 0), 0) || 1;
  let acc = 0;
  const { ref, w: W } = useChartWidth();
  const label = stages.map((s) => `${STAGE_LABEL[s]} ${hm(minutes[s] ?? 0)}`).join(", ");

  return (
    <figure className="cb-figure cb-sleep">
      <svg ref={ref} className="cb cb-sleepbar" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Schlafphasen: ${label}`}>
        <g>
          {stages.map((s) => {
            const w = ((minutes[s] ?? 0) / total) * W;
            const r = <rect key={s} x={acc + 1} width={Math.max(0, w - 2)} y={0} height={H} className={`cb-sleep-${s}`} />;
            acc += w;
            return r;
          })}
        </g>
      </svg>
      <figcaption className="cb-legend">
        {stages.map((s) => (
          <span key={s}>
            <i className={`cb-key-sleep-${s}`} />
            {STAGE_LABEL[s]} <b>{hm(minutes[s] ?? 0)}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
