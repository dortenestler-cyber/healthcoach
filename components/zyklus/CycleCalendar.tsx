"use client";

import Link from "next/link";
import { useState } from "react";
import { nextPeriodText, projectedPhase } from "@/lib/cycle";
import type { Data, Diary } from "@/lib/insights";
import EditSheet from "@/components/ui/EditSheet";
import Tagesblatt from "@/components/tag/Tagesblatt";
import { longDate } from "@/lib/dates";
import { PHASE4, PHASE4_LABEL, phase4Of, type Phase4 } from "@/components/zyklus/CycleRing";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

type Cell = { day: string; n: number; phase: Phase4 | null; future: boolean; today: boolean; symptom: boolean; ov: boolean } | null;

// Monatskalender mit den Zyklusphasen als durchgehende Bänder (Konzept dunkel 2, Muster 9).
// Kommende Tage gestrichelt (geschätzt), heute mit Ring, Punkt = Symptome eingetragen, ✦ = Eisprung-Zeichen eingetragen.
// Nach dem geschätzten nächsten Beginn rechnet der Kalender mit der üblichen Länge weiter (Vorschau, bis 3 Monate).
// Tippen auf einen Tag öffnet das Tagesblatt (Konzept Bündeln, Baustein 1)
export default function CycleCalendar({ today, diary, data }: { today: string; diary: Diary[]; data?: Data | null }) {
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const base = new Date(today + "T12:00:00");
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1, 12);
  const y = first.getFullYear();
  const m = first.getMonth();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDay = new Map(diary.map((d) => [d.day, d]));

  const cells: Cell[] = Array(lead).fill(null);
  for (let n = 1; n <= daysIn; n++) {
    const day = iso(y, m, n);
    const e = byDay.get(day);
    const bleeding = (e?.bleeding ?? 0) > 0;
    cells.push({
      day,
      n,
      phase: bleeding && day <= today ? "menstruation" : phase4Of(projectedPhase(day, today, diary).phase),
      future: day > today,
      today: day === today,
      symptom: Object.values(e?.symptoms ?? {}).some((v) => v > 0),
      ov: !!e?.ovulation?.length,
    });
  }
  while (cells.length % 7) cells.push(null);

  const segment = (i: number) => {
    const c = cells[i];
    if (!c || !c.phase) return "";
    const col = i % 7;
    const prev = col > 0 ? cells[i - 1] : null;
    const next = col < 6 ? cells[i + 1] : null;
    const same = (o: Cell) => !!o && o.phase === c.phase && o.future === c.future;
    return `${same(prev) ? "" : " cal-start"}${same(next) ? "" : " cal-end"}`;
  };

  const forecast = nextPeriodText(today, diary);

  return (
    <section className="card">
      {forecast && <p className="cal-forecast">{forecast}</p>}
      <div className="cal-nav">
        <button type="button" className="icon-btn" aria-label="Voriger Monat" onClick={() => setOffset(offset - 1)}>‹</button>
        <span className="eyebrow cal-title">{MONTHS[m]} {y}</span>
        <button type="button" className="icon-btn" aria-label="Nächster Monat" disabled={offset >= 3} onClick={() => setOffset(offset + 1)}>›</button>
      </div>
      <div className="cal-grid cal-head" aria-hidden="true">
        {WD.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="cal-grid cal-days">
        {cells.map((c, i) =>
          c ? (
            <button key={c.day} type="button" onClick={() => setPicked(c.day)} className={`cal-cell${c.phase ? ` cal-${c.phase}` : ""}${c.future ? " cal-future" : ""}${segment(i)}`}>
              <span className="cal-band" aria-hidden="true" />
              <span className={`cal-num${c.today ? " cal-today" : ""}`}>
                {c.n}
                <span className="sr-only">
                  {`. ${MONTHS[m]}${c.phase ? ", " + PHASE4_LABEL[c.phase] : ""}${c.future ? ", geschätzt" : ""}${c.today ? ", heute" : ""}${c.symptom ? ", Symptome eingetragen" : ""}${c.ov ? ", Eisprung-Zeichen eingetragen" : ""}`}
                </span>
              </span>
              {c.symptom && <span className="cal-dot" aria-hidden="true" />}
              {c.ov && <span className="cal-ov" aria-hidden="true">✦</span>}
            </button>
          ) : (
            <div key={"x" + i} className="cal-cell" aria-hidden="true" />
          ),
        )}
      </div>
      <div className="legend cal-legend">
        {PHASE4.map((p) => (
          <span key={p}><i className={`cal-key-${p}`} />{PHASE4_LABEL[p]}</span>
        ))}
        <span><i className="cal-key-dot" />Symptome</span>
        <span><i className="cal-key-future" />geschätzt</span>
        {cells.some((c) => c?.ov) && <span><span className="cal-ov-key" aria-hidden="true">✦</span>Eisprung-Zeichen</span>}
      </div>
      <Link href="/tagebuch" className="add-row">
        <span className="cyc4-text-menstruation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg></span>
        <span className="add-row-label">Periode eintragen</span>
        <span className="add-row-plus" aria-hidden="true">+</span>
      </Link>
      <EditSheet title={picked ? (picked === today ? "Heute" : longDate(new Date(picked + "T12:00:00"))) : "Tag"} open={!!picked} instant onClose={() => setPicked(null)}>
        {picked && <Tagesblatt key={picked} day={picked} data={data ?? null} bare />}
      </EditSheet>
    </section>
  );
}
