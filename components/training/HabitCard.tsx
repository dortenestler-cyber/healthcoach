"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Data } from "@/lib/insights";
import { DEFAULT_TRAINING_DAYS, loadSettings, saveSettings } from "@/lib/training";

const WEEKS = 24;
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Trainingstage als Raster (Konzept dunkel 2, Muster 15): ein Feld je Tag, eine Spalte je Woche, letzte 24 Wochen.
// Ziel = Trainingstage pro Woche, hier mit − und + einstellbar (Einstellung trainingDaysGoal, Startwert 4).
// Ein Tag zählt mit Garmin-Aktivität oder mit einer im Kalender erfassten Einheit.
// Serie und Bestwert zählen Wochen, in denen das Ziel erreicht war.
export default function HabitCard({ today, data }: { today: string; data: Data }) {
  const [goal, setGoal] = useState(DEFAULT_TRAINING_DAYS);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadSettings(sb)
      .then((s) => {
        if (typeof s.trainingDaysGoal === "number") setGoal(s.trainingDaysGoal);
      })
      .catch(() => undefined);
  }, []);

  const changeGoal = async (n: number) => {
    const next = Math.max(1, Math.min(7, n));
    setGoal(next);
    const sb = supabase();
    if (!sb) return;
    const s = await loadSettings(sb);
    await saveSettings(sb, { ...s, trainingDaysGoal: next });
  };

  const trained = new Set([...data.acts.map((a) => (a.start_local ?? "").slice(0, 10)), ...(data.done ?? []).map((d) => d.day)].filter(Boolean));
  const mon = addDays(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
  const start = addDays(mon, -7 * (WEEKS - 1));
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const count = (wk: string[]) => wk.filter((d) => d <= today && trained.has(d)).length;
  const met = weeks.map((wk) => count(wk) >= goal);
  const thisWeek = count(weeks[WEEKS - 1]);

  // Serie: zurück ab der letzten abgeschlossenen Woche, die laufende zählt mit, wenn sie das Ziel schon erreicht hat
  let streak = met[WEEKS - 1] ? 1 : 0;
  for (let i = WEEKS - 2; i >= 0 && met[i]; i--) streak++;
  let best = 0;
  let run = 0;
  for (const m of met) {
    run = m ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const pct = Math.min(100, Math.round((thisWeek / goal) * 100));
  const r = 23;
  const c = 2 * Math.PI * r;
  const monthMarks = weeks.map((wk, i) => ({ i, m: Number(wk[0].slice(5, 7)) - 1 })).filter((x, i, all) => i === 0 || x.m !== all[i - 1].m);
  const weeksWithData = weeks.filter((wk) => wk.some((d) => d <= today && trained.has(d))).length;

  return (
    <section className="card">
      <div className="habit-head">
        <span className="habit-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4a1.5 1.5 0 1 0 0 .1" /><path d="M7 21l3-6 3 2v4" /><path d="M10 15l1-5 4 3 3-1" /><path d="M8 11l3-1" /></svg>
        </span>
        <div className="stack habit-text">
          <span className="row-strong">Training</span>
          <span className="meta">{thisWeek} von {goal} Tagen diese Woche</span>
        </div>
        <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${pct} Prozent des Wochenziels`} className="cb cb-training habit-ring">
          <g transform="rotate(-90 28 28)" fill="none">
            <circle cx="28" cy="28" r={r} strokeWidth="5" className="cb-ring-track" />
            {pct > 0 && <circle cx="28" cy="28" r={r} strokeWidth="5" strokeLinecap="round" className="cb-ring-value" style={{ strokeDasharray: `${(pct / 100) * c} ${c}` }} />}
          </g>
          <text x="28" y="32" textAnchor="middle" className="habit-ring-text">{pct}%</text>
        </svg>
      </div>
      <div className="card-row habit-goal">
        <span className="meta">Ziel pro Woche</span>
        <div className="stepper" role="group" aria-label="Trainingstage pro Woche">
          <button type="button" aria-label="Ein Tag weniger" disabled={goal <= 1} onClick={() => changeGoal(goal - 1)}>−</button>
          <span className="row-strong" aria-live="polite">{goal} {goal === 1 ? "Tag" : "Tage"}</span>
          <button type="button" aria-label="Ein Tag mehr" disabled={goal >= 7} onClick={() => changeGoal(goal + 1)}>+</button>
        </div>
      </div>
      <div className="habit-stats">
        <span>Serie <strong>{streak} {streak === 1 ? "Woche" : "Wochen"}</strong></span>
        <span>Bestwert <strong>{best} {best === 1 ? "Woche" : "Wochen"}</strong></span>
      </div>
      <div className="habit-months" aria-hidden="true">
        {monthMarks.map((x) => (
          <span key={x.i} style={{ left: `${(x.i / WEEKS) * 100}%` }}>{MONTHS[x.m]}</span>
        ))}
      </div>
      <div className="habit-grid" role="img" aria-label={`Trainingstage der letzten ${WEEKS} Wochen. Ziel ${goal} Tage pro Woche, erreicht in ${met.filter(Boolean).length} Wochen.`}>
        {weeks.flatMap((wk) =>
          wk.map((d) => <span key={d} className={d > today ? "habit-cell habit-future" : trained.has(d) ? "habit-cell habit-on" : "habit-cell"} />),
        )}
      </div>
      <div className="legend habit-legend">
        <span><i className="habit-key-off" />kein Training</span>
        <span><i className="habit-key-on" />Training</span>
      </div>
      {weeksWithData < 4 && <span className="meta">Das Raster füllt sich mit deinen Garmin-Aktivitäten und den im Kalender erfassten Einheiten.</span>}
      <span className="meta">Ein Tag zählt mit mindestens einer Garmin-Aktivität oder einer im Kalender erfassten Einheit.</span>
    </section>
  );
}
