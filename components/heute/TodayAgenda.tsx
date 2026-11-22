"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HealthToday from "@/components/HealthToday";
import TodayPlan from "@/components/TodayPlan";
import type { DayRule } from "@/lib/cycle";
import { dayLoad, type Data } from "@/lib/insights";
import { supabase } from "@/lib/supabase";

// „Heute steht an“: alles, was heute zu tun ist, in einer Karte.
// Hinweise bei Krankheit oder Verletzung · Training mit Belastung · Medikamente · offener Check-in.
export default function TodayAgenda({ day, data, rule, showPlan, showLoad }: { day: string; data: Data | null; rule: DayRule | null; showPlan: boolean; showLoad: boolean }) {
  const [checkinOpen, setCheckinOpen] = useState(false);

  useEffect(() => {
    supabase()
      ?.from("checkins")
      .select("day")
      .eq("day", day)
      .maybeSingle()
      .then(({ data: c, error }) => setCheckinOpen(!error && !c));
  }, [day]);

  const t = rule?.target;
  const dl = data ? dayLoad(day, data.daily, data.acts) : null;
  const load = dl?.pct ?? null;
  const loadLine =
    showLoad && t && load !== null ? (
      <div className="card-row list-line">
        <span>
          Belastung <strong>{load} %</strong>
          {dl?.pctAlltag ? `, davon Alltag ${dl.pctAlltag} %` : ""}
          {t.pause ? " · heute Pause" : ` · ${load < t.lo ? "unter dem" : load <= t.hi ? "im" : "über dem"} Ziel von ${t.lo}–${t.hi} %`}
        </span>
        <Link href="/training?t=auswertung" className="link-small">Tagesziel ›</Link>
      </div>
    ) : null;

  return (
    <section className="card">
      <span className="eyebrow">Heute steht an</span>
      <HealthToday>
        {showPlan ? <TodayPlan>{loadLine}</TodayPlan> : loadLine && <div className="agenda-part">{loadLine}</div>}
      </HealthToday>
      {checkinOpen && (
        <Link href="/tagebuch" className="agenda-part card-row">
          <span className="row-label">Morgen-Check-in noch offen</span>
          <span className="link-small">Im Tagebuch ›</span>
        </Link>
      )}
    </section>
  );
}
