"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { stats } from "@/lib/garmin";
import { weekStart } from "@/lib/health";
import { fromIso, KB_TEMPLATE, kgText, planWeek, targetKg, type KbItem, type KbPlan, type KbSet } from "@/lib/training";

type Entry = { reps: number; kg: number; done: boolean };

export default function KettlebellSection() {
  const [plan, setPlan] = useState<KbPlan | null | undefined>(undefined);
  const [items, setItems] = useState<KbItem[]>([]);
  const [sets, setSets] = useState<KbSet[]>([]);
  const [lowRecovery, setLowRecovery] = useState<string | null>(null);
  const [lighter, setLighter] = useState(false);
  const [log, setLog] = useState<Record<string, Entry[]> | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data: p, error: e } = await sb.from("kb_plans").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1);
    if (e) {
      setError("Plan konnte nicht geladen werden: " + e.message);
      return;
    }
    const current = ((p ?? []) as KbPlan[])[0] ?? null;
    setPlan(current);
    const [it, st, g] = await Promise.all([
      current ? sb.from("kb_plan_items").select("*").eq("plan_id", current.id).order("pos") : Promise.resolve({ data: [] }),
      sb.from("kb_sets").select("day, exercise, set_no, reps, weight_kg, target_reps, target_kg, plan_id").gte("day", isoDay(daysAgo(7 * 8))).order("day"),
      sb.from("garmin_daily").select("day, hrv_last_night, bb_max").gte("day", isoDay(daysAgo(29))).order("day"),
    ]);
    setItems((it.data ?? []) as KbItem[]);
    setSets((st.data ?? []) as KbSet[]);
    // Niedrige Erholung: Body Battery heute unter 40 oder HRV deutlich unter dem Schnitt
    const rows = (g.data ?? []) as { day: string; hrv_last_night: number | null; bb_max: number | null }[];
    const latest = rows[rows.length - 1];
    const hrv = stats(rows.slice(0, -1).map((r) => r.hrv_last_night).filter((v): v is number => v !== null));
    let reason: string | null = null;
    if (latest && latest.day >= isoDay(daysAgo(1))) {
      if (latest.bb_max !== null && latest.bb_max < 40) reason = `Body Battery nur ${latest.bb_max}`;
      else if (latest.hrv_last_night !== null && hrv && hrv.sd > 0 && latest.hrv_last_night < hrv.mean - hrv.sd) reason = `HRV ${latest.hrv_last_night} ms, unter deinem Normalbereich`;
    }
    setLowRecovery(reason);
    setLighter(!!reason);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb || plan === undefined) return error ? <p className="alert">{error}</p> : null;

  const createPlan = async () => {
    const { data, error: e } = await sb
      .from("kb_plans")
      .insert({ name: KB_TEMPLATE.name, goal: KB_TEMPLATE.goal, weeks: KB_TEMPLATE.weeks, per_week: KB_TEMPLATE.per_week, step_kg: KB_TEMPLATE.step_kg, step_every_weeks: KB_TEMPLATE.step_every_weeks, start_date: isoDay() })
      .select("id")
      .single();
    if (e || !data) return setError("Plan konnte nicht angelegt werden: " + (e?.message ?? ""));
    const { error: e2 } = await sb.from("kb_plan_items").insert(KB_TEMPLATE.items.map((it, pos) => ({ ...it, pos, plan_id: (data as { id: string }).id })));
    if (e2) setError("Übungen konnten nicht angelegt werden: " + e2.message);
    load();
  };

  if (!plan) {
    return (
      <>
        {error && <p className="alert">{error}</p>}
        <section className="card">
          <h2>Noch kein Kettlebell-Plan</h2>
          <p>
            Vorschlag „{KB_TEMPLATE.name}“: {KB_TEMPLATE.weeks} Wochen, {KB_TEMPLATE.per_week} Einheiten pro Woche, alle {KB_TEMPLATE.step_every_weeks} Wochen {KB_TEMPLATE.step_kg} kg mehr, höchstens 20 kg.
          </p>
          {KB_TEMPLATE.items.map((it) => (
            <div key={it.exercise} className="card-row list-line">
              <span>{it.exercise}</span>
              <span className="meta">
                {it.sets} × {it.reps}{it.per_side ? " je Seite" : ""} · {kgText(it.weight_kg)}
              </span>
            </div>
          ))}
          <button type="button" className="btn btn-dark" onClick={createPlan}>Plan anlegen</button>
          <span className="meta">Gewichte und Wiederholungen kannst du danach anpassen.</span>
        </section>
      </>
    );
  }

  const week = planWeek(plan);
  const planSets = sets.filter((s) => s.plan_id === plan.id);
  const sessionDays = Array.from(new Set(planSets.map((s) => s.day))).sort();
  const total = plan.weeks * plan.per_week;
  const lastDay = sessionDays[sessionDays.length - 1];
  const doneToday = lastDay === isoDay();

  const startLog = () => {
    const l: Record<string, Entry[]> = {};
    for (const it of items) l[it.id] = Array.from({ length: it.sets }, () => ({ reps: it.reps, kg: targetKg(it, plan, lighter), done: false }));
    setLog(l);
  };

  const setEntry = (id: string, i: number, patch: Partial<Entry>) => setLog((l) => (l ? { ...l, [id]: l[id].map((e, j) => (j === i ? { ...e, ...patch } : e)) } : l));

  const saveLog = async () => {
    if (!log) return;
    const rows = items.flatMap((it) =>
      log[it.id]
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.done)
        .map(({ e, i }) => ({ plan_id: plan.id, day: isoDay(), exercise: it.exercise, set_no: i + 1, reps: e.reps, weight_kg: e.kg, target_reps: it.reps, target_kg: targetKg(it, plan, lighter) }))
    );
    if (!rows.length) return setError("Hak mindestens einen Satz ab.");
    const { error: e } = await sb.from("kb_sets").insert(rows);
    if (e) return setError("Einheit konnte nicht gespeichert werden: " + e.message);
    await sb.from("planned_sessions").update({ status: "erledigt" }).eq("day", isoDay()).eq("sport", "kettlebell");
    setLog(null);
    setError("");
    load();
  };

  const updateItem = (it: KbItem, patch: Partial<KbItem>) =>
    sb.from("kb_plan_items").update(patch).eq("id", it.id).then(({ error: e }) => {
      if (e) setError("Das hat nicht geklappt: " + e.message);
      load();
    });

  // Volumen pro Woche (Wiederholungen × kg), älteste zuerst
  const now = weekStart(new Date()).getTime();
  const volume = Array.from({ length: 8 }, () => 0);
  for (const s of planSets) {
    const w = Math.round((now - weekStart(fromIso(s.day)).getTime()) / (7 * 864e5));
    if (w >= 0 && w < 8) volume[7 - w] += s.reps * s.weight_kg;
  }
  const maxVol = Math.max(1, ...volume);
  const lastSets = planSets.filter((s) => s.day === lastDay);

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <div className="stack">
            <span className="meta">Aktiver Plan</span>
            <span className="row-strong">{plan.name}</span>
          </div>
          <span className="badge badge-accent">Woche {week} von {plan.weeks}</span>
        </div>
        <div className="progress"><span style={{ width: Math.min(100, (sessionDays.length / total) * 100) + "%" }} /></div>
        <span className="meta">{sessionDays.length} von {total} Einheiten · {plan.per_week} pro Woche</span>
      </section>

      {lowRecovery && (
        <div className="rule rule-stop">
          <span className="row-strong">Erholung heute niedrig</span>
          <span>{lowRecovery}. Die leichtere Variante nimmt 2 kg weniger.</span>
          <div className="pills">
            <button type="button" className="pill pill-sm" aria-pressed={lighter} onClick={() => setLighter(true)}>Leichter</button>
            <button type="button" className="pill pill-sm" aria-pressed={!lighter} onClick={() => setLighter(false)}>Wie geplant</button>
          </div>
        </div>
      )}

      <section className="card">
        <div className="card-row">
          <h2>{log ? "Einheit erfassen" : "Diese Woche"}</h2>
          {!log && (
            <button type="button" className="btn btn-link" onClick={() => setEditing(!editing)}>
              {editing ? "Fertig" : "Anpassen"}
            </button>
          )}
        </div>
        {!log &&
          items.map((it) => (
            <div key={it.id} className="stack list-line">
              <div className="card-row">
                <span className="row-strong">{it.exercise}</span>
                <span className="meta">
                  {it.sets} × {it.reps}{it.per_side ? " je Seite" : ""} · {kgText(targetKg(it, plan, lighter))}
                </span>
              </div>
              {editing && (
                <div className="card-row">
                  <span className="meta">Start {kgText(it.weight_kg)} · {it.sets} Sätze · {it.reps} Wdh.</span>
                  <div className="pills">
                    <button type="button" className="pill pill-sm" onClick={() => updateItem(it, { weight_kg: Math.max(0, it.weight_kg - 1) })}>−1 kg</button>
                    <button type="button" className="pill pill-sm" onClick={() => updateItem(it, { weight_kg: Math.min(20, it.weight_kg + 1) })}>+1 kg</button>
                    <button type="button" className="pill pill-sm" onClick={() => updateItem(it, { reps: Math.max(1, it.reps - 1) })}>−1</button>
                    <button type="button" className="pill pill-sm" onClick={() => updateItem(it, { reps: it.reps + 1 })}>+1</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        {log &&
          items.map((it) => (
            <div key={it.id} className="stack list-line">
              <span className="row-strong">{it.exercise}{it.per_side ? " · je Seite" : ""}</span>
              {log[it.id].map((e, i) => (
                <div key={i} className="set-row">
                  <span className="meta">Satz {i + 1}</span>
                  <div className="stepper small">
                    <button type="button" aria-label="Weniger Wiederholungen" onClick={() => setEntry(it.id, i, { reps: Math.max(0, e.reps - 1) })}>−</button>
                    <span>{e.reps}×</span>
                    <button type="button" aria-label="Mehr Wiederholungen" onClick={() => setEntry(it.id, i, { reps: e.reps + 1 })}>+</button>
                  </div>
                  {it.weight_kg > 0 ? (
                    <div className="stepper small">
                      <button type="button" aria-label="Leichter" onClick={() => setEntry(it.id, i, { kg: Math.max(1, e.kg - 1) })}>−</button>
                      <span>{e.kg} kg</span>
                      <button type="button" aria-label="Schwerer" onClick={() => setEntry(it.id, i, { kg: Math.min(20, e.kg + 1) })}>+</button>
                    </div>
                  ) : (
                    <span className="meta">Körpergewicht</span>
                  )}
                  <button type="button" className={e.done ? "pill pill-sm pill-done" : "pill pill-sm"} onClick={() => setEntry(it.id, i, { done: !e.done })}>
                    {e.done ? "✓" : "Satz"}
                  </button>
                </div>
              ))}
            </div>
          ))}
        {log ? (
          <div className="footer-links left">
            <button type="button" className="btn btn-dark" onClick={saveLog}>Einheit speichern</button>
            <button type="button" className="btn btn-link" onClick={() => setLog(null)}>Abbrechen</button>
          </div>
        ) : (
          <button type="button" className="btn btn-dark" onClick={startLog}>
            {doneToday ? "Noch eine Einheit erfassen" : "Einheit starten"}
          </button>
        )}
      </section>

      {lastSets.length > 0 && (
        <section className="card">
          <div className="card-row">
            <h2>Soll und Ist</h2>
            <span className="meta">{shortDate(fromIso(lastDay))}</span>
          </div>
          {items.map((it) => {
            const mine = lastSets.filter((s) => s.exercise === it.exercise);
            if (!mine.length) return null;
            const reps = mine.reduce((a, s) => a + s.reps, 0);
            const target = mine.reduce((a, s) => a + (s.target_reps ?? 0), 0);
            const kgDiff = mine.some((s) => s.target_kg !== null && s.weight_kg !== s.target_kg);
            return (
              <div key={it.id} className="card-row list-line">
                <span>{it.exercise}</span>
                <span className={reps < target ? "meta meta-warn" : "meta"}>
                  {reps} von {target} Wdh.{kgDiff ? " · Gewicht angepasst" : ""}
                </span>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h2>Volumen pro Woche</h2>
        <div className="bars" role="img" aria-label="Kettlebell-Volumen der letzten 8 Wochen">
          {volume.map((v, i) => (
            <div key={i} className="bar-col">
              <span className="bar-val">{v ? Math.round(v / 100) / 10 + " t" : ""}</span>
              <span className="bar" style={{ height: Math.max(3, (v / maxVol) * 64) + "px", background: i === 7 ? "var(--accent)" : "#cfcdc8" }} />
            </div>
          ))}
        </div>
        <span className="meta">Wiederholungen mal Gewicht, ohne Übungen mit Körpergewicht. Die letzte Säule ist diese Woche.</span>
      </section>

      <button type="button" className="btn btn-link center-link" onClick={() => sb.from("kb_plans").update({ active: false }).eq("id", plan.id).then(() => load())}>
        Plan beenden
      </button>
    </>
  );
}
