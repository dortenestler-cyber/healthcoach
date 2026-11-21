"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import { activityLabel, durationText, type Activity } from "@/lib/garmin";
import type { Illness, Injury } from "@/lib/health";
import { ensurePlanned, healthEffect, loadSettings, sportOfGarmin, SPORTS, type Session } from "@/lib/training";

// Heute geplant: Einheiten des Tages mit Hinweis aus Gesundheit und Garmin
export default function TodayPlan() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [illness, setIllness] = useState<Illness | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    (async () => {
      try {
        await ensurePlanned(sb, await loadSettings(sb));
      } catch {
        // Plan wird im Kalender erneut angelegt
      }
      const day = isoDay();
      const [p, a, il, inj] = await Promise.all([
        sb.from("planned_sessions").select("*").eq("day", day),
        sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load").gte("start_local", day).lte("start_local", day + "T23:59:59"),
        sb.from("illnesses").select("*").is("ended_on", null).limit(1),
        sb.from("injuries").select("*").is("ended_on", null),
      ]);
      setSessions((p.data ?? []) as Session[]);
      setActs((a.data ?? []) as Activity[]);
      setIllness(((il.data ?? []) as Illness[])[0] ?? null);
      setInjuries((inj.data ?? []) as Injury[]);
    })();
  }, []);

  if (sessions === null) return null;
  const open = sessions.filter((s) => s.status !== "ausgelassen");

  return (
    <section className="card">
      <div className="card-row">
        <h2>Heute geplant</h2>
        <Link href="/training" className="link-small">Kalender ›</Link>
      </div>
      {!open.length && !acts.length && <p>Heute ist frei. Gehen oder Mobilität tun trotzdem gut.</p>}
      {open.map((s) => {
        const done = s.status === "erledigt" || acts.some((a) => sportOfGarmin(a.type_key) === s.sport);
        const eff = done ? null : healthEffect(s.sport, s.day, illness, injuries);
        return (
          <div key={s.id} className="stack list-line">
            <div className="card-row">
              <span className="row-strong">
                <i className="dot" style={{ background: SPORTS[s.sport].color }} />
                {SPORTS[s.sport].label}
                {s.time ? " · " + s.time : ""}
              </span>
              <span className={done ? "badge badge-ok" : eff && eff.kind !== "angepasst" ? "badge badge-warn" : "badge badge-training"}>
                {done ? "erledigt" : eff?.kind === "pause" ? "Pause" : eff?.kind === "gesperrt" ? "pausiert" : "geplant"}
              </span>
            </div>
            {eff && <span className="meta meta-warn">{eff.text}</span>}
            {!done && s.sport === "kettlebell" && !eff && (
              <Link href="/training?t=kettlebell" className="link-small">Einheit starten ›</Link>
            )}
          </div>
        );
      })}
      {acts
        .filter((a) => !open.some((s) => s.sport === sportOfGarmin(a.type_key)))
        .map((a) => (
          <div key={a.activity_id} className="card-row list-line">
            <span className="row-strong">
              <i className="dot" style={{ background: SPORTS[sportOfGarmin(a.type_key)].color }} />
              {activityLabel(a)}
            </span>
            <span className="meta">{durationText(a.duration_s)} · Garmin</span>
          </div>
        ))}
    </section>
  );
}
