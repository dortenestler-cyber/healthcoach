"use client";

import type { Data } from "@/lib/insights";
import { cardioFokus, FOKUS_NAMEN, FOKUS_REIHE, fokusSatz, type FokusArt } from "@/lib/cardioFokus";

const ZONE: Record<FokusArt, string> = { locker: "zone-bg-2", intensiv: "zone-bg-4", anaerob: "zone-bg-5" };

// Cardio-Fokus der letzten 4 Wochen: drei Balken mit Anteil und Last, Mangel markiert
export default function CardioFokusCard({ today, data }: { today: string; data: Data }) {
  const f = cardioFokus(today, data);
  return (
    <section className="card">
      <span className="eyebrow">Cardio-Fokus · 4 Wochen</span>
      <p className="row-strong">{fokusSatz(f)}</p>
      {f.gesamt > 0 && (
        <ul className="fokus-list">
          {FOKUS_REIHE.map((k) => (
            <li key={k} className="fokus-row">
              <span className="fokus-label">
                {FOKUS_NAMEN[k]}
                {f.mangel.includes(k) ? " · Mangel" : f.schwerpunkt === k ? " · Schwerpunkt" : ""}
              </span>
              <span className="fokus-track" aria-hidden="true">
                <span className={`fokus-fill ${ZONE[k]}`} style={{ width: `${Math.round(f.anteil[k] * 100)}%` }} />
              </span>
              <span className="fokus-value">
                {Math.round(f.anteil[k] * 100)} % · {Math.round(f.last[k])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
