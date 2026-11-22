"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay, shortDate } from "@/lib/dates";
import { INJURY_CAUSES, INJURY_KINDS, SPOTS, type Injury } from "@/lib/health";

type Pain = { injury_id: string; day: string; pain: number };
const toDate = (iso: string) => new Date(iso + "T12:00:00");

export default function InjurySection() {
  const [list, setList] = useState<Injury[] | null>(null);
  const [pains, setPains] = useState<Pain[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [i, p] = await Promise.all([
      sb.from("injuries").select("*").order("started_on", { ascending: false }).limit(30),
      sb.from("injury_pain").select("injury_id, day, pain").order("day"),
    ]);
    if (i.error) setError("Verletzungen konnten nicht geladen werden: " + i.error.message);
    const rows = (i.data ?? []) as Injury[];
    setList(rows);
    setPains((p.data ?? []) as Pain[]);
    setSelected((cur) => cur ?? rows.find((r) => !r.ended_on)?.id ?? null);
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

  const activeList = (list ?? []).filter((r) => !r.ended_on);
  const current = activeList.find((r) => r.id === selected) ?? null;
  const spotInfo = current ? SPOTS[current.spot] : null;
  const myPains = current ? pains.filter((p) => p.injury_id === current.id) : [];
  const todayPain = myPains.find((p) => p.day === isoDay())?.pain ?? myPains[myPains.length - 1]?.pain ?? 4;

  const pickSpot = async (spot: string) => {
    const existing = activeList.find((r) => r.spot === spot);
    if (existing) {
      setSelected(existing.id);
      return;
    }
    const { data, error: e } = await sb.from("injuries").insert({ spot, started_on: isoDay() }).select("id").single();
    if (e) {
      setError("Das hat nicht geklappt: " + e.message);
      return;
    }
    setSelected((data as { id: string }).id);
    load();
  };

  const setPain = (v: number) => current && run(sb.from("injury_pain").upsert({ injury_id: current.id, day: isoDay(), pain: Math.max(0, Math.min(10, v)) }, { onConflict: "injury_id,day" }));
  const update = (patch: Partial<Injury>) => current && run(sb.from("injuries").update(patch).eq("id", current.id));

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <h2>Wo tut es weh?</h2>
          <span className="meta">{spotInfo ? spotInfo.label : "Stelle antippen"}</span>
        </div>
        <div className="body-map">
          <svg width="200" height="250" viewBox="0 0 200 250" aria-hidden="true" className="body-figure">
            <circle cx="100" cy="24" r="15" strokeWidth="6" />
            <path d="M74 54h52l-6 74H80z" strokeWidth="6" />
            <path d="M70 56L52 98L44 140M130 56L148 98L156 140M88 136L84 190L82 236M112 136L116 190L118 236" />
          </svg>
          {Object.entries(SPOTS).map(([k, s]) => {
            const isActive = activeList.some((r) => r.spot === k);
            const isSel = current?.spot === k;
            return (
              <button
                key={k}
                type="button"
                aria-label={s.label}
                className="spot"
                data-active={isActive}
                data-selected={isSel}
                style={{ left: s.x, top: s.y }}
                onClick={() => pickSpot(k)}
              />
            );
          })}
        </div>
        <div className="pills wrap center">
          {Object.entries(SPOTS).map(([k, s]) => (
            <button key={k} type="button" className="pill pill-sm" aria-pressed={current?.spot === k} onClick={() => pickSpot(k)}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {current && spotInfo && (
        <>
          <section className="card">
            <span className="label">Art</span>
            <div className="pills wrap">
              {INJURY_KINDS.map((v) => (
                <button key={v} type="button" className="pill pill-sm" aria-pressed={current.kind === v} onClick={() => update({ kind: v })}>
                  {v}
                </button>
              ))}
            </div>
            <span className="label">Wobei passiert?</span>
            <div className="pills wrap">
              {INJURY_CAUSES.map((v) => (
                <button key={v} type="button" className="pill pill-sm" aria-pressed={current.cause === v} onClick={() => update({ cause: v })}>
                  {v}
                </button>
              ))}
            </div>
            <div className="card-row">
              <span className="row-label">Schmerz heute</span>
              <div className="stepper">
                <button type="button" aria-label="Weniger" onClick={() => setPain(todayPain - 1)}>−</button>
                <span>{todayPain} / 10</span>
                <button type="button" aria-label="Mehr" onClick={() => setPain(todayPain + 1)}>+</button>
              </div>
            </div>
            {myPains.length > 0 && (
              <>
                <span className="meta">Heilungsverlauf</span>
                <div className="bars small">
                  {myPains.slice(-10).map((p) => (
                    <div key={p.day} className="bar-col">
                      <span className="bar" style={{ height: Math.max(3, p.pain * 5) + "px", background: p.day === isoDay() ? "var(--warn)" : "var(--line-strong)" }} />
                      <span className="bar-val">{shortDate(toDate(p.day)).replace(/\.$/, "")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card">
            <h2>So passt sich dein Training an</h2>
            {spotInfo.rows.map(([what, instead]) => (
              <div key={what} className="stack list-line">
                <span className="row-strong">{what}</span>
                <span className="meta">Stattdessen: {instead}</span>
              </div>
            ))}
            <p className="kyu">{spotInfo.kyu}</p>
          </section>

          <button type="button" className="btn btn-dark" onClick={() => { update({ ended_on: isoDay() }); setSelected(null); }}>
            Verheilt
          </button>
        </>
      )}

      {list && list.filter((r) => r.ended_on).length > 0 && (
        <section className="card">
          <h2>Frühere Verletzungen</h2>
          {list
            .filter((r) => r.ended_on)
            .map((r) => (
              <div key={r.id} className="card-row list-line">
                <span>{SPOTS[r.spot]?.label ?? r.spot}{r.kind ? " · " + r.kind : ""}</span>
                <span className="meta">{shortDate(toDate(r.started_on))}</span>
              </div>
            ))}
        </section>
      )}

      <span className="hint">Bitte ärztlich abklären: starke Schwellung, Taubheit, Fehlstellung, ein plötzlicher Schmerz wie ein Schlag an der Ferse oder Schmerz, der nach einer Woche nicht nachlässt.</span>
    </>
  );
}
