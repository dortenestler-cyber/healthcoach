"use client";

import { useEffect, useState } from "react";
import { isoDay } from "@/lib/dates";
import { cycleInfo, patterns, type Data } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import PageHead from "@/components/PageHead";

// Muster aus Training, Erholung, Zyklus, Symptomen und Medikamenten
export default function MusterView() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInsightData()
      .then(setData)
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  const list = data ? patterns(data) : [];
  const cyc = data ? cycleInfo(isoDay(), data.diary) : null;
  const ready = list.filter((p) => p.ready);
  const waiting = list.filter((p) => !p.ready);

  return (
    <>
      <PageHead title="Muster" sub={cyc?.cycleDay ? `Zyklustag ${cyc.cycleDay} · Zyklus etwa ${cyc.length} Tage` : "Training, Erholung und Zyklus zusammen"} />
      {error && <p className="alert">{error}</p>}
      {data && !ready.length && (
        <section className="card">
          <h2>Noch zu wenige Daten</h2>
          <p>Muster erscheinen, sobald genug Tage zusammenkommen. Führe weiter Tagebuch und Check-in, dann füllt sich diese Seite nach und nach.</p>
        </section>
      )}
      {ready.map((p) => {
        const max = Math.max(1, ...p.bars.map((b) => b.value));
        return (
          <section key={p.key} className="card">
            <h2>{p.title}</h2>
            <p>{p.text}</p>
            {p.bars.map((b) => (
              <div key={b.label} className="pattern-row">
                <span className="meta">{b.label}</span>
                <div className="pyramid-track">
                  <span style={{ width: (b.value / max) * 100 + "%", background: b.highlight ? "var(--text)" : "var(--line-strong)" }} />
                </div>
                <span className="row-strong">{b.display}</span>
              </div>
            ))}
            <span className="meta">Grundlage: {p.basis}. Ein Zusammenhang, kein Beweis.</span>
          </section>
        );
      })}
      {waiting.length > 0 && (
        <section className="card">
          <h2>Diese Muster kommen noch</h2>
          {waiting.map((p) => (
            <div key={p.key} className="stack list-line">
              <span className="row-strong">{p.title}</span>
              <span className="meta">{p.need}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
