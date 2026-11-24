"use client";

// „Dieser Monat“ auf der Wert-Seite: Satz mit Ergebnis, Kacheln Schnitt · Vormonat · Tage im Bereich · bester Tag.
// Rechnung in lib/monat.ts.

import type { BaseCtx } from "@/lib/baseline";
import { METRICS, type Daily, type MetricKey } from "@/lib/garmin";
import { monatsBlick } from "@/lib/monat";

const kurz = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

export default function DieserMonat({ metric, rows, ctx, today }: { metric: MetricKey; rows: Daily[]; ctx: BaseCtx; today: string }) {
  const b = monatsBlick(metric, rows, ctx, today);
  const fmt = METRICS[metric].fmt;
  if (!b.tage) return null;
  const tiles: [string, string, string?][] = [
    ["Schnitt " + b.monat, b.schnitt === null ? "–" : fmt(b.schnitt)],
    ["Schnitt " + b.vormonat, b.schnittVor === null ? "–" : fmt(b.schnittVor)],
    ["Tage im Bereich", b.imBereich === null ? "–" : `${b.imBereich} von ${b.bewertet}`, b.imBereich === null ? "Bereich ab 14 Tagen" : undefined],
  ];
  if (b.bester) tiles.push([METRICS[metric].higherIsBetter ? "Bester Tag" : "Niedrigster Tag", fmt(b.bester.v), kurz(b.bester.day)]);
  return (
    <section className="card">
      <span className="eyebrow">Dieser Monat</span>
      <h2>{b.satz}</h2>
      <div className="monat-tiles">
        {tiles.map(([l, v, n]) => (
          <div key={l} className="unit-tile">
            <span className="meta">{l}</span>
            <span className="row-strong monat-val">{v}</span>
            {n && <span className="meta">{n}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
