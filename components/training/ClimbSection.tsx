"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { GRADES, GOAL_GRADE, sportOf, type Climb } from "@/lib/training";
import { boulderZiel } from "@/lib/ziele";
import Zielkarte from "@/components/training/Zielkarte";

const RESULTS: [Climb["result"], string][] = [
  ["flash", "Flash"],
  ["top", "Top"],
  ["versuch", "Versuch"],
];

// Bouldern in der Fontainebleau-Skala: Einträge, Grad-Pyramide, Erfolgsquote
export default function ClimbSection() {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [sessions, setSessions] = useState(0);
  const [grade, setGrade] = useState("5");
  const [result, setResult] = useState<Climb["result"]>("top");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(7 * 8));
    const [c, a] = await Promise.all([
      sb.from("climbs").select("id, day, grade, result").gte("day", from).order("created_at"),
      sb.from("garmin_activities").select("type_key, start_local, sport_override").gte("start_local", from),
    ]);
    if (c.error) setError("Boulder konnten nicht geladen werden: " + c.error.message);
    setClimbs((c.data ?? []) as Climb[]);
    setSessions(((a.data ?? []) as { type_key: string | null; sport_override?: string | null }[]).filter((r) => sportOf(r) === "klettern").length);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const add = async () => {
    const { error: e } = await sb.from("climbs").insert({ day: isoDay(), grade, result });
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };
  const remove = async (id: string) => {
    await sb.from("climbs").delete().eq("id", id);
    load();
  };

  const today = climbs.filter((c) => c.day === isoDay());
  const tops = (g: string) => climbs.filter((c) => c.grade === g && c.result !== "versuch").length;
  const all = (g: string) => climbs.filter((c) => c.grade === g).length;
  const maxTops = Math.max(1, ...GRADES.map(tops));
  const goalTops = tops(GOAL_GRADE) + GRADES.slice(GRADES.indexOf(GOAL_GRADE) + 1).reduce((a, g) => a + tops(g), 0);
  const below = GRADES[GRADES.indexOf(GOAL_GRADE) - 1];

  const z = boulderZiel(climbs);
  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}
      <Zielkarte ziel={z.ziel} zeit={z.zeit} zeitNote={z.zeitNote} anteil={z.total ? z.sitzt / z.total : 0} mitte={`${z.sitzt}/${z.total}`} wort={z.wort} satz={z.satz}>
        <span className="meta">{sessions} Boulder-Einheiten aus Garmin in den letzten 8 Wochen.</span>
      </Zielkarte>

      <section className="card">
        <h2>Boulder eintragen</h2>
        <div className="grade-grid">
          {GRADES.map((g) => (
            <button key={g} type="button" className="pill pill-box" aria-pressed={grade === g} onClick={() => setGrade(g)}>
              {g}
            </button>
          ))}
        </div>
        <div className="pills">
          {RESULTS.map(([k, l]) => (
            <button key={k} type="button" className="pill pill-sm" aria-pressed={result === k} onClick={() => setResult(k)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-dark" onClick={add}>
          {grade} · {RESULTS.find(([k]) => k === result)?.[1]} eintragen
        </button>
        {today.length > 0 && (
          <>
            <span className="meta">Heute</span>
            <div className="pills wrap">
              {today.map((c) => (
                <button key={c.id} type="button" className={c.result === "versuch" ? "pill pill-sm" : "pill pill-sm pill-done"} onClick={() => remove(c.id)} aria-label={`${c.grade} ${c.result} löschen`}>
                  {c.grade} · {c.result === "flash" ? "Flash" : c.result === "top" ? "Top" : "Versuch"} ×
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-row">
          <h2>Grad-Pyramide</h2>
          <span className="meta">Tops, letzte 8 Wochen</span>
        </div>
        {[...GRADES].reverse().map((g) => {
          const t = tops(g);
          const n = all(g);
          return (
            <div key={g} className="pyramid-row">
              <span className="row-strong">{g}</span>
              <div className="pyramid-track">
                <span style={{ width: (t / maxTops) * 100 + "%", background: g === GOAL_GRADE ? "var(--training)" : "var(--line-strong)" }} />
              </div>
              <span className="meta">{n ? `${t} · ${Math.round((t / n) * 100)} %` : "–"}</span>
            </div>
          );
        })}
      </section>

    </>
  );
}
