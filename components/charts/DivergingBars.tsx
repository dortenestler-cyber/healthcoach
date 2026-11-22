// Balken um den Nullpunkt (Konzept dunkel 2, Muster 11): eine Zeile je Einfluss, schraffierte Spur, Punkt in der Mitte.
// Rechts mehr, links weniger. Zahl mit Vorzeichen und Anzahl der Nächte stehen immer dabei.
// Positive Werte in der Farbe des Tons, negative neutral: keine Ampelfarben.

import { type Tone } from "@/components/charts/scale";

export type DivRow = { label: string; value: number | null; note: string; isNew?: boolean };

type Props = {
  rows: DivRow[];
  fmt: (v: number) => string;
  label: string;
  tone?: Tone;
  neg?: string; // Überschrift links, z. B. „HRV niedriger“
  pos?: string; // Überschrift rechts
  scaleMin?: number; // kleinster Vollausschlag, damit kleine Unterschiede auch klein aussehen
};

export default function DivergingBars({ rows, fmt, label, tone = "recovery", neg = "niedriger", pos = "höher", scaleMin = 1 }: Props) {
  const max = Math.max(scaleMin, ...rows.map((r) => Math.abs(r.value ?? 0)));
  return (
    <div className={`div-list cb-${tone}`} role="group" aria-label={label}>
      <div className="div-head" aria-hidden="true">
        <span>▾ {neg}</span>
        <span>Unterschied</span>
        <span>{pos} ▴</span>
      </div>
      {rows.map((r, i) => {
        const w = r.value === null ? 0 : (Math.abs(r.value) / max) * 48;
        const zero = r.value === null || fmt(Math.abs(r.value)) === fmt(0);
        const sign = zero ? "±" : (r.value as number) > 0 ? "+" : "−";
        return (
          <div key={r.label + i} className={`div-row${r.isNew ? " div-new" : ""}`}>
            <div className="div-row-head">
              {r.isNew && <span className="badge-new">Neu</span>}
              <span className="div-label">{r.label}</span>
              <span className={`div-value${r.value !== null && r.value > 0 && !zero ? " div-pos" : ""}`}>{r.value === null ? "–" : `${sign}${fmt(Math.abs(r.value))}`}</span>
            </div>
            <div className="div-track" aria-hidden="true">
              {r.value !== null && <span className={r.value >= 0 ? "div-bar div-bar-pos" : "div-bar div-bar-neg"} style={{ left: r.value >= 0 ? "50%" : `${50 - w}%`, width: `${Math.max(1, w)}%` }} />}
              <span className="div-zero" />
            </div>
            <span className="meta">{r.note}</span>
          </div>
        );
      })}
    </div>
  );
}
