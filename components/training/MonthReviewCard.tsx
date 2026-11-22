"use client";

import { useState } from "react";
import type { Data } from "@/lib/insights";
import { SPORTS, sportOfGarmin, type Sport } from "@/lib/training";
import { SPORT_ABBR } from "@/components/training/WeekLoadView";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Monatsrückblick (Konzept dunkel 2, Muster 16): Anzahl Einheiten groß, Vergleich zum Vormonat,
// Kalender mit einer Blase je Trainingstag in der Farbe der Sportart, immer mit Kürzel. Antippen einer Sportart filtert.
export default function MonthReviewCard({ today, data }: { today: string; data: Data }) {
  const [filter, setFilter] = useState<Sport | null>(null);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  const ym = today.slice(0, 7);
  const prev = new Date(y, m - 1, 15, 12);
  const pym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const acts = data.acts.filter((a) => a.start_local).map((a) => ({ day: (a.start_local as string).slice(0, 10), sport: sportOfGarmin(a.type_key) }));
  const mine = acts.filter((a) => a.day.startsWith(ym));
  const prevCount = acts.filter((a) => a.day.startsWith(pym)).length;
  const shown = filter ? mine.filter((a) => a.sport === filter) : mine;
  const byDay = new Map<string, Sport[]>();
  for (const a of shown) byDay.set(a.day, [...(byDay.get(a.day) ?? []), a.sport]);
  const sportsInMonth = [...new Set(mine.map((a) => a.sport))];
  const daysIn = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1, 12).getDay() + 6) % 7;
  const diff = mine.length - prevCount;
  const prevName = MONTHS[prev.getMonth()];

  return (
    <section className="card">
      <span className="eyebrow">Rückblick {MONTHS[m]}</span>
      <div className="review-count">
        {diff !== 0 && <span className="review-arrow" aria-hidden="true">{diff > 0 ? "▲" : "▼"}</span>}
        <span className="review-number">{mine.length}</span>
        <span className="review-unit">{mine.length === 1 ? "Einheit" : "Einheiten"}</span>
      </div>
      <span className="meta">{diff === 0 ? `So viele wie im ${prevName}` : `${Math.abs(diff)} ${diff > 0 ? "mehr" : "weniger"} als im ${prevName} (${prevCount})`}</span>
      <div className="cal-grid cal-head" aria-hidden="true">
        {WD.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="cal-grid review-grid">
        {Array.from({ length: lead }, (_, i) => <span key={"x" + i} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const day = iso(y, m, i + 1);
          const sp = byDay.get(day);
          return sp ? (
            <span key={day} className={`review-bubble ink-${sp[0]}${day === today ? " review-today" : ""}`} style={{ background: SPORTS[sp[0]].color }} aria-label={`${i + 1}. ${MONTHS[m]}: ${sp.map((s) => SPORTS[s].label).join(", ")}`}>
              <b>{i + 1}</b>
              <small>{SPORT_ABBR[sp[0]]}{sp.length > 1 ? ` ×${sp.length}` : ""}</small>
            </span>
          ) : (
            <span key={day} className={`review-day${day > today ? " review-future" : ""}${day === today ? " review-today-plain" : ""}`}>{i + 1}</span>
          );
        })}
      </div>
      {sportsInMonth.length > 0 && (
        <div className="pills review-filter" role="group" aria-label="Nach Sportart filtern">
          {sportsInMonth.map((s) => (
            <button key={s} type="button" className="pill pill-sm" aria-pressed={filter === s} onClick={() => setFilter(filter === s ? null : s)}>
              <i className="review-key" style={{ background: SPORTS[s].color }} />
              {SPORTS[s].label}
            </button>
          ))}
        </div>
      )}
      {!mine.length && <span className="meta">In diesem Monat noch keine Garmin-Aktivität.</span>}
    </section>
  );
}
