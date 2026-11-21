"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import { computeTarget, loadPercent, type Data } from "@/lib/insights";
import { weekStart } from "@/lib/health";
import { sportOfGarmin, WEEKDAY_LABELS, type Session } from "@/lib/training";

// Diese Woche: Belastung je Tag vor dem grünen Zielbereich, Soll und Ist der Einheiten
export default function WeekLoadCard({ data }: { data: Data | null }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = isoDay();
  const mon = weekStart(new Date());
  const days = Array.from({ length: 7 }, (_, i) => isoDay(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));

  const from = days[0];
  const to = days[6];

  useEffect(() => {
    supabase()
      ?.from("planned_sessions")
      .select("*")
      .gte("day", from)
      .lte("day", to)
      .then(({ data: d }) => setSessions((d ?? []) as Session[]));
  }, [from, to]);

  if (!data) return null;

  const actsOn = (d: string) => data.acts.filter((a) => (a.start_local ?? "").slice(0, 10) === d);
  const planned = sessions.filter((s) => s.status !== "ausgelassen");
  const done = planned.filter((s) => s.status === "erledigt" || actsOn(s.day).some((a) => sportOfGarmin(a.type_key) === s.sport)).length;

  const cols = days.map((d) => {
    if (d > today) return { d, future: true, lo: 0, hi: 0, load: 0 };
    const t = computeTarget(d, data);
    return { d, future: false, lo: t.lo, hi: t.hi, load: loadPercent(d, data.daily, data.acts) };
  });
  const past = cols.filter((c) => !c.future && c.d < today);
  const inBand = cols.filter((c) => !c.future && c.load >= c.lo && c.load <= c.hi).length;

  const insight = !planned.length
    ? `Diese Woche ist noch nichts geplant. An ${inBand} ${inBand === 1 ? "Tag" : "Tagen"} warst du im Zielbereich.`
    : `${done} von ${planned.length} Einheiten erledigt, an ${inBand} ${inBand === 1 ? "Tag" : "Tagen"} im Zielbereich.`;

  return (
    <section className="card">
      <span className="meta">Diese Woche</span>
      <h2>{insight}</h2>
      <div className="week-bars" role="img" aria-label={`Belastung je Tag dieser Woche. ${insight}`}>
        {cols.map((c, i) => (
          <div key={c.d} className="week-col" data-today={c.d === today}>
            <div className="tb-track" data-future={c.future}>
              {!c.future && <span className="tb-band" style={{ bottom: c.lo + "%", height: c.hi - c.lo + "%" }} />}
              {!c.future && <span className="tb-load" style={{ height: Math.max(2, c.load) + "%", background: c.load > c.hi ? "var(--warn)" : "var(--training)" }} />}
            </div>
            <small>{WEEKDAY_LABELS[i]}</small>
          </div>
        ))}
      </div>
      <div className="card-row">
        <div className="stack">
          <span className="meta">Soll</span>
          <span className="metric-value">{planned.length}</span>
        </div>
        <div className="stack">
          <span className="meta">Ist</span>
          <span className="metric-value">{done}</span>
        </div>
        <div className="stack right">
          <span className="meta">Im Zielbereich</span>
          <span className="metric-value">{inBand} / {past.length + 1}</span>
        </div>
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--recovery-bg)" }} />Zielbereich</span>
        <span><i style={{ background: "var(--training)" }} />Belastung</span>
        <span><i style={{ background: "var(--warn)" }} />über dem Ziel</span>
      </div>
    </section>
  );
}
