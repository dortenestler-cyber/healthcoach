"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { ILLNESSES, illnessRule, RETURN_STEPS, type Illness } from "@/lib/health";

const toDate = (iso: string) => new Date(iso + "T12:00:00");

export default function IllnessSection() {
  const [list, setList] = useState<Illness[] | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("illnesses").select("*").order("started_on", { ascending: false }).limit(30);
    if (e) setError("Krankheiten konnten nicht geladen werden: " + e.message);
    setList((data ?? []) as Illness[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: e } = await p;
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };

  const active = list?.find((i) => !i.ended_on) ?? null;
  const lastEnded = list?.find((i) => i.ended_on);
  const showReturn = !active && lastEnded?.ended_on && lastEnded.ended_on >= isoDay(daysAgo(5));
  const rule = active ? illnessRule(active) : null;

  const start = (key: string, label: string, fever = false, below = false) =>
    run(sb.from("illnesses").insert({ kind: key, label, started_on: isoDay(), fever, below_neck: below, severity: 2 }));
  const update = (patch: Partial<Illness>) => active && run(sb.from("illnesses").update(patch).eq("id", active.id));

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      {active && rule && (
        <section className="card">
          <div className="card-row">
            <h2>{active.label}</h2>
            <span className="meta">seit {active.started_on === isoDay() ? "heute" : shortDate(toDate(active.started_on))}</span>
          </div>
          <span className="label">Wie stark?</span>
          <div className="grid-5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className="pill pill-box" aria-pressed={active.severity === v} onClick={() => update({ severity: v })}>
                {v}
              </button>
            ))}
          </div>
          {(
            [
              ["fever", "Fieber"],
              ["below_neck", "Husten oder Gliederschmerzen"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="card-row">
              <span className="row-label">{l}</span>
              <div className="pills">
                <button type="button" className="pill pill-sm" aria-pressed={active[k]} onClick={() => update({ [k]: true } as Partial<Illness>)}>Ja</button>
                <button type="button" className="pill pill-sm" aria-pressed={!active[k]} onClick={() => update({ [k]: false } as Partial<Illness>)}>Nein</button>
              </div>
            </div>
          ))}
          <div className={rule.stop ? "rule rule-stop" : "rule"}>
            <span className="row-strong">Training: {rule.title}</span>
            <span>{rule.text}</span>
          </div>
          <button type="button" className="btn btn-dark" onClick={() => update({ ended_on: isoDay() })}>
            Wieder gesund
          </button>
        </section>
      )}

      {!active && (
        <section className="card">
          <h2>Was hast du?</h2>
          <div className="pills wrap">
            {ILLNESSES.map((i) => (
              <button key={i.key} type="button" className="pill" onClick={() => start(i.key, i.label, i.fever, i.below)}>
                {i.label}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input className="input" placeholder="Etwas anderes" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Andere Krankheit" />
            <button
              type="button"
              className="btn btn-quiet"
              disabled={!other.trim()}
              onClick={() => {
                start("eigen", other.trim());
                setOther("");
              }}
            >
              Eintragen
            </button>
          </div>
        </section>
      )}

      {showReturn && (
        <section className="card">
          <h2>Wiedereinstieg in Stufen</h2>
          {RETURN_STEPS.map((s) => (
            <div key={s.when} className="list-row">
              <span className="row-strong">{s.when}</span>
              <span className="meta">{s.what}</span>
            </div>
          ))}
        </section>
      )}

      {list && list.filter((i) => i.ended_on).length > 0 && (
        <section className="card">
          <h2>Verlauf</h2>
          {list
            .filter((i) => i.ended_on)
            .map((i) => {
              const days = Math.round((toDate(i.ended_on as string).getTime() - toDate(i.started_on).getTime()) / 864e5) + 1;
              return (
                <div key={i.id} className="card-row list-line">
                  <span>{i.label}</span>
                  <span className="meta">
                    {shortDate(toDate(i.started_on))} · {days} {days === 1 ? "Tag" : "Tage"}
                  </span>
                </div>
              );
            })}
        </section>
      )}

      <span className="hint">Bitte ärztlich abklären: Fieber über mehrere Tage, Brustschmerz, Atemnot oder Herzrasen.</span>
    </>
  );
}
