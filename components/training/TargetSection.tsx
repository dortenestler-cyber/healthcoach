"use client";

import { useEffect, useState } from "react";
import { Details } from "@/components/ui/Pille";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { computeTarget, loadPercent, sportAdvice, type Data, type Target } from "@/lib/insights";
import { SPOTS, type Injury } from "@/lib/health";
import LoadCard from "@/components/heute/LoadCard";

// Tagesziel im Detail (Training › Auswertung, früher eigene Seite /tagesziel):
// Belastung heute, was das Ziel bestimmt, Empfehlung je Sportart, 14 Tage Ziel und Ist
export default function TargetSection({ data }: { data: Data }) {
  const [injured, setInjured] = useState<string[]>([]);

  useEffect(() => {
    supabase()
      ?.from("injuries")
      .select("spot")
      .is("ended_on", null)
      .then(({ data: d }) => setInjured(((d ?? []) as Pick<Injury, "spot">[]).flatMap((i) => SPOTS[i.spot]?.sports ?? [])));
  }, []);

  const day = isoDay();
  const t: Target = computeTarget(day, data);
  const history = Array.from({ length: 14 }, (_, i) => {
    const d = isoDay(daysAgo(13 - i));
    const tt = computeTarget(d, data);
    return { d, lo: tt.lo, hi: tt.hi, load: loadPercent(d, data.daily, data.acts) };
  });

  const inTarget = history.filter((h) => h.load >= h.lo && h.load <= h.hi).length;

  return (
    <>
      <LoadCard day={day} data={data} target={t} />

      <section className="card">
        <div className="card-row">
          <h2>Was das Ziel bestimmt</h2>
          <span className="meta">Punkte {t.score} von 100</span>
        </div>
        <p className="ziel-kurz">{t.pause ? "Heute Pause." : `Stufe heute: ${t.label}, ${t.lo}–${t.hi} %.`}</p>
        <Details id="ziel.gruende" label="Gründe und Rechenweg">
        {t.factors.map((f) => (
          <div key={f.name} className="factor-row list-line">
            <div className="stack">
              <span className="row-strong">{f.name}{f.value ? " · " + f.value : ""}</span>
              <span className="meta">{f.note}</span>
            </div>
            <span className={f.effect < 0 ? "factor-effect neg" : "factor-effect"}>{f.effect > 0 ? "+" + f.effect : f.effect === 0 ? "±0" : f.effect}</span>
          </div>
        ))}
        {!t.factors.length && <p>Noch keine Daten für heute. Synchronisiere Garmin auf der Seite Heute (Karte „Deine Werte“).</p>}
        <span className="meta">{t.pause ? "Heute Pause." : `Stufe heute: ${t.label}, ${t.lo}–${t.hi} %.`} 100 % entsprechen etwa einem harten Trainingstag (60 Intensitätsminuten).</span>
        <span className="meta">Ausgangswert 80 Punkte. Ab 85 hart möglich, ab 65 moderat, ab 45 leicht, darunter Erholung.</span>
        </Details>
      </section>

      <section className="card">
        <h2>Empfehlung je Sportart</h2>
        <Details id="ziel.sportarten" label="Je Sportart anzeigen">
        {sportAdvice(t, injured).map((a) => (
          <div key={a.sport} className="card-row list-line">
            <span className="row-strong">{a.sport}</span>
            <span className="meta">{a.tip}</span>
          </div>
        ))}
        </Details>
      </section>

      <section className="card">
        <span className="eyebrow">Ziel und Ist, 14 Tage</span>
        <h2>{inTarget === 0 ? "An keinem der letzten 14 Tage" : inTarget === 1 ? "An einem der letzten 14 Tage" : `An ${inTarget} der letzten 14 Tage`} lag deine Belastung im Zielbereich.</h2>
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
  );
}
