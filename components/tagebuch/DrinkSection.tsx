"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { atFor } from "@/lib/intakes";
import { loadSettings } from "@/lib/training";
import {
  amountText,
  DEFAULT_WATER_GOAL,
  DEFAULT_WATER_GOAL_TRAINING,
  DRINK_LABEL,
  DRINK_QUICK,
  fmtAmount,
  isLate,
  timeOf,
  totals,
  type DrinkKind,
  type DrinkRow,
} from "@/lib/drinks";

// Getränke eines Tages: Schnelleintrag, Liste mit Uhrzeit zum Löschen, Wasserstand gegen das Tagesziel.
// Heute mit Uhrzeit jetzt, an vergangenen Tagen um 12:00 oder zur gewählten Uhrzeit.
export default function DrinkSection({ day }: { day: string }) {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [goal, setGoal] = useState(DEFAULT_WATER_GOAL);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("drink_log").select("id, at, day, kind, amount, source").eq("day", day).order("at");
    if (e) setError("Getränke konnten nicht geladen werden: " + e.message);
    else setError("");
    setRows((data ?? []) as DrinkRow[]);
  }, [day]);

  useEffect(() => {
    load();
    const sb = supabase();
    if (!sb) return;
    // Ziel: an Trainingstagen höher (geplant oder erledigt)
    Promise.all([
      loadSettings(sb),
      sb.from("planned_sessions").select("sport", { count: "exact", head: true }).eq("day", day).neq("status", "ausgelassen"),
      sb.from("garmin_activities").select("activity_id", { count: "exact", head: true }).gte("start_local", day + "T00:00:00").lt("start_local", day + "T23:59:59"),
    ]).then(([s, plan, acts]) => {
      const num = (v: unknown, d: number) => (typeof v === "number" && v > 0 && v <= 10 ? v : d);
      const training = (plan.count ?? 0) > 0 || (acts.count ?? 0) > 0;
      setGoal(training ? num(s.waterGoalTraining, DEFAULT_WATER_GOAL_TRAINING) : num(s.waterGoal, DEFAULT_WATER_GOAL));
    });
  }, [day, load]);

  const sb = supabase();
  if (!sb) return null;

  const add = async (kind: DrinkKind, amount: number) => {
    const at = time && /^\d{2}:\d{2}$/.test(time) ? atFor(day, time) : atFor(day, null);
    const { error: e } = await sb.from("drink_log").insert({ at, day, kind, amount, source: "app" });
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };
  const remove = async (id: string) => {
    const { error: e } = await sb.from("drink_log").delete().eq("id", id);
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };

  const t = totals(rows);
  const pct = Math.min(100, Math.round((t.wasser / goal) * 100));
  const late = rows.some(isLate);

  return (
    <section className="card">
      <h2>Getränke</h2>
      <div className="card-row">
        <div className="stack">
          <span className="big-number">{fmtAmount(t.wasser)} L</span>
          <span className="meta">von {fmtAmount(goal)} L Wasser</span>
        </div>
        <div className="stack drink-sum">
          <span>Kaffee {fmtAmount(t.kaffee)}</span>
          <span>Tee {fmtAmount(t.tee)}</span>
          <span>Alkohol {fmtAmount(t.alkohol)}</span>
        </div>
      </div>
      <div className="progress" role="img" aria-label={`Wasser ${pct} Prozent vom Tagesziel`}>
        <span className="drink-fill" style={{ width: pct + "%" }} />
      </div>
      <div className="drink-quick">
        {DRINK_QUICK.map((q) => (
          <button key={q.label} type="button" className="btn btn-soft btn-44" onClick={() => add(q.kind, q.amount)}>
            + {q.label}
          </button>
        ))}
      </div>
      <div className="card-row list-line">
        <label htmlFor={"drink-time-" + day} className="row-label">Uhrzeit (sonst jetzt)</label>
        <input id={"drink-time-" + day} className="input settings-select" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {rows.length > 0 && (
        <ul className="drink-list">
          {rows.map((r) => (
            <li key={r.id} className="card-row list-line">
              <span>
                {timeOf(r.at)} · {DRINK_LABEL[r.kind]} {amountText(r.kind, Number(r.amount))}
                {isLate(r) && <span className="drink-late"> · nach 14 Uhr</span>}
              </span>
              <button type="button" className="btn btn-soft btn-44" aria-label={`${DRINK_LABEL[r.kind]} um ${timeOf(r.at)} löschen`} onClick={() => remove(r.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {late && <span className="meta drink-late">Koffein nach 14 Uhr ist als Gewohnheit gesetzt.</span>}
      {error && <p className="alert alert-inline">{error}</p>}
    </section>
  );
}
