"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate, shortDate } from "@/lib/dates";
import { computeTarget, loadPercent, sportAdvice, type Data, type Target } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import { SPOTS, type Injury } from "@/lib/health";
import LoadCard from "@/components/heute/LoadCard";
import PageHead from "@/components/PageHead";

// Tagesziel im Detail: Faktoren, Empfehlung je Sportart, 14 Tage Ziel und Ist
export default function TargetView() {
  const [data, setData] = useState<Data | null>(null);
  const [injured, setInjured] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInsightData()
      .then(setData)
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
    supabase()
      ?.from("injuries")
      .select("spot")
      .is("ended_on", null)
      .then(({ data: d }) => setInjured(((d ?? []) as Pick<Injury, "spot">[]).flatMap((i) => SPOTS[i.spot]?.sports ?? [])));
  }, []);

  const day = isoDay();
  const t: Target | null = data ? computeTarget(day, data) : null;
  const load = data ? loadPercent(day, data.daily, data.acts) : 0;
  const history = data
    ? Array.from({ length: 14 }, (_, i) => {
        const d = isoDay(daysAgo(13 - i));
        const tt = computeTarget(d, data);
        return { d, lo: tt.lo, hi: tt.hi, load: loadPercent(d, data.daily, data.acts) };
      })
    : [];

  return (
    <>
      <Link href="/" className="back-link">‹ Heute</Link>
      <PageHead title="Tagesziel" sub={longDate()} tone="training" />
      {error && <p className="alert">{error}</p>}
      {t && (
        <>
          {data && <LoadCard day={day} data={data} target={t} />}

          <section className="card">
            <div className="card-row">
              <h2>Was das Ziel bestimmt</h2>
              <span className="meta">Punkte {t.score} von 100</span>
            </div>
            {t.factors.map((f) => (
              <div key={f.name} className="factor-row list-line">
                <div className="stack">
                  <span className="row-strong">{f.name}{f.value ? " · " + f.value : ""}</span>
                  <span className="meta">{f.note}</span>
                </div>
                <span className={f.effect < 0 ? "factor-effect neg" : "factor-effect"}>{f.effect > 0 ? "+" + f.effect : f.effect === 0 ? "±0" : f.effect}</span>
              </div>
            ))}
            {!t.factors.length && <p>Noch keine Daten für heute. Synchronisiere Garmin auf der Seite Heute.</p>}
            <span className="meta">{t.pause ? "Heute Pause." : `Stufe heute: ${t.label}, ${t.lo}–${t.hi} %.`} 100 % entsprechen etwa einem harten Trainingstag (60 Intensitätsminuten).</span>
            <span className="meta">Ausgangswert 80 Punkte. Ab 85 hart möglich, ab 65 moderat, ab 45 leicht, darunter Erholung.</span>
          </section>

          <section className="card">
            <h2>Empfehlung je Sportart</h2>
            {sportAdvice(t, injured).map((a) => (
              <div key={a.sport} className="card-row list-line">
                <span className="row-strong">{a.sport}</span>
                <span className="meta">{a.tip}</span>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Ziel und Ist, 14 Tage</h2>
            <div className="target-bars" role="img" aria-label="Zielbereich und Belastung der letzten 14 Tage">
              {history.map((h) => (
                <div key={h.d} className="tb-col">
                  <div className="tb-track">
                    <span className="tb-band" style={{ bottom: h.lo + "%", height: h.hi - h.lo + "%" }} />
                    <span className="tb-load" style={{ height: Math.max(2, h.load) + "%", background: h.load > h.hi ? "var(--warn)" : "var(--training)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card-row meta">
              <span>{shortDate(daysAgo(13))}</span>
              <span>heute</span>
            </div>
            <div className="legend">
              <span><i style={{ background: "var(--recovery-bg)" }} />Zielbereich</span>
              <span><i style={{ background: "var(--training)" }} />Belastung</span>
              <span><i style={{ background: "var(--warn)" }} />über dem Ziel</span>
            </div>
          </section>
        </>
      )}
    </>
  );
}
