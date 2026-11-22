import { DayBars, ValueHeader, ZoneScale } from "@/components/charts";
import type { Data } from "@/lib/insights";
import { weekLoad } from "@/lib/trainingLoad";

const n0 = (v: number) => String(Math.round(v));

// Wochenlast: Satz, Zahl, Korridor, dann Zonen-Skala für die Woche und Säulen je Tag. Ohne Netzwerk.
export default function WeekLoadView({ today, data, planned, done, labels }: { today: string; data: Data; planned: number; done: number; labels: string[] }) {
  const w = weekLoad(today, data);
  const c = w.corridor;
  const sentence = !c
    ? "Dein Zielkorridor entsteht nach 4 Wochen mit Garmin-Aktivitäten."
    : w.sum < c.lo
      ? `Noch ${c.lo - w.sum} bis zu deinem Korridor für diese Woche.`
      : w.sum <= c.hi
        ? "Deine Wochenlast liegt in deinem Korridor."
        : "Deine Wochenlast liegt über deinem Korridor. Plane eher ruhig weiter.";
  const max = c ? Math.max(c.hi * 1.4, w.sum * 1.1) : 1;

  return (
    <section className="card">
      <ValueHeader meta="Wochenlast · diese Woche" sentence={sentence} value={n0(w.sum)}>
        {c ? (
          <>
            <p className="value-range">Korridor {c.lo}–{c.hi} · aus dem Schnitt der 4 Wochen davor ({n0(w.avg4 ?? 0)})</p>
            <ZoneScale
              value={w.sum}
              min={0}
              max={max}
              fmt={n0}
              label={`Wochenlast ${w.sum}, Korridor ${c.lo} bis ${c.hi}`}
              zones={[{ to: c.lo, label: "darunter" }, { to: c.hi, label: "Korridor", target: true }, { to: max, label: "darüber" }]}
            />
          </>
        ) : null}
        <DayBars
          tone="training"
          fmt={n0}
          label={`Trainingslast je Tag: ${w.days.map((d, i) => `${labels[i]} ${d.load ?? "noch offen"}`).join(", ")}`}
          bars={w.days.map((d, i) => ({ label: labels[i], value: d.load, today: d.day === today }))}
        />
      </ValueHeader>
      <div className="card-row">
        <div className="stack">
          <span className="meta">Geplant</span>
          <span className="metric-value">{planned}</span>
        </div>
        <div className="stack">
          <span className="meta">Erledigt</span>
          <span className="metric-value">{done}</span>
        </div>
        <div className="stack right">
          <span className="meta">Tage mit Training</span>
          <span className="metric-value">{w.days.filter((d) => (d.load ?? 0) > 0).length}</span>
        </div>
      </div>
      <span className="meta">Trainingslast aus Garmin. Korridor 80–130 % deiner üblichen Woche, ein Richtwert.</span>
    </section>
  );
}
