"use client";

import { useEffect, useState } from "react";
import { DayBars } from "@/components/charts";
import type { Tone } from "@/components/charts/scale";
import type { Data } from "@/lib/insights";
import { supabase } from "@/lib/supabase";
import { dayCurve, loadSnapshots, peakHour, type DayCurve } from "@/lib/tagesverlauf";

// Verlauf über den Tag je Stunde aus den Zwischenständen der Abrufe (Nutzerin 25.11.): Stress, Schritte, Intensität.
type Kind = "stress" | "steps" | "intensity";

const CFG: Record<Kind, { eyebrow: string; tone: Tone; unit: (v: number) => string; head: (h: number) => string; aria: string }> = {
  stress: { eyebrow: "Stress über den Tag", tone: "stress", unit: (v) => String(Math.round(v)), head: (h) => `Am angespanntesten war es zwischen ${h} und ${h + 1} Uhr.`, aria: "Stress je Stunde" },
  steps: { eyebrow: "Schritte über den Tag", tone: "training", unit: (v) => Math.round(v).toLocaleString("de-DE"), head: (h) => `Die meisten Schritte zwischen ${h} und ${h + 1} Uhr.`, aria: "Schritte je Stunde" },
  intensity: { eyebrow: "Intensität über den Tag", tone: "training", unit: (v) => `${Math.round(v)} min`, head: (h) => `Die meisten Minuten zwischen ${h} und ${h + 1} Uhr.`, aria: "Intensitätsminuten je Stunde" },
};

const pick = (c: DayCurve, k: Kind) => (k === "stress" ? c.stress : k === "steps" ? c.steps : c.intensity);

export default function DayCurveCard({ kind, day, data }: { kind: Kind; day: string; data: Data }) {
  const [curve, setCurve] = useState<DayCurve | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let live = true;
    loadSnapshots(sb, day, day).then((snaps) => {
      if (live) setCurve(dayCurve(day, snaps, data.acts));
    });
    return () => {
      live = false;
    };
  }, [day, data.acts]);

  if (!curve) return null;
  const cfg = CFG[kind];
  const values = pick(curve, kind);
  const peak = peakHour(values);

  return (
    <section className="card">
      <span className="eyebrow">{cfg.eyebrow}</span>
      {peak === null ? (
        <p className="meta">Noch keine Zwischenstände für diesen Tag.</p>
      ) : (
        <>
          <h2>{cfg.head(peak)}</h2>
          <DayBars
            tone={cfg.tone}
            fmt={cfg.unit}
            height={140}
            label={`${cfg.aria}: ${values.map((v, h) => (v === null ? null : `${h} Uhr ${cfg.unit(v)}`)).filter(Boolean).join(", ")}`}
            bars={values.map((v, h) => ({ label: h % 6 === 0 ? String(h) : "", value: v, today: h === peak, tip: `${h}–${h + 1} Uhr` }))}
          />
        </>
      )}
    </section>
  );
}
