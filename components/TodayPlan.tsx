"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import { activityLabel, durationText, loadActivityOverrides, withOverrides, type Activity } from "@/lib/garmin";
import type { Illness, Injury } from "@/lib/health";
import { ensurePlanned, healthEffect, loadSettings, sportOf, SPORTS, type Session } from "@/lib/training";

// Training heute: Einheiten des Tages mit Hinweis aus Gesundheit und Garmin. Teil der Karte „Heute steht an“.
// children: z. B. die Zeile zur Belastung.
export default function TodayPlan({ children }: { children?: ReactNode }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [illness, setIllness] = useState<Illness | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [expanded, setExpanded] = useState(false);

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
      const [p, a, il, inj, so] = await Promise.all([
        sb.from("planned_sessions").select("*").eq("day", day),
        sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load").gte("start_local", day).lte("start_local", day + "T23:59:59"),
        sb.from("illnesses").select("*").is("ended_on", null).limit(1),
        sb.from("injuries").select("*").is("ended_on", null),
        loadActivityOverrides(sb, day),
      ]);
      setSessions((p.data ?? []) as Session[]);
      setActs(withOverrides((a.data ?? []) as Activity[], so));
      setIllness(((il.data ?? []) as Illness[])[0] ?? null);
      setInjuries((inj.data ?? []) as Injury[]);
    })();
  }, []);

  if (sessions === null) return null;
  const open = sessions.filter((s) => s.status !== "ausgelassen");
  const isDone = (s: Session) => s.status === "erledigt" || acts.some((a) => sportOf(a) === s.sport);

  // Alles Geplante erledigt: eine Zeile mit ✓, Tipp klappt auf
  if (open.length && open.every(isDone) && !expanded) {
    const text = open
      .map((s) => {
        const a = acts.find((x) => sportOf(x) === s.sport);
        return SPORTS[s.sport].label + (a ? " · " + durationText(a.duration_s) : "");
      })
      .join(", ");
    return (
      <div className="agenda-part">
        <button type="button" className="card-row fold-row" onClick={() => setExpanded(true)} aria-expanded={false}>
          <span className="row-label"><span className="fold-ok" aria-hidden="true">✓</span> Training erledigt · {text}</span>
          <span className="link-small">Anzeigen ⌄</span>
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="agenda-part">
      <div className="card-row">
        <h3>Training</h3>
        <Link href="/training" className="link-small">Kalender ›</Link>
      </div>
      {!open.length && !acts.length && <p>Heute ist frei. Gehen oder Mobilität tun trotzdem gut.</p>}
      {open.map((s) => {
        const done = isDone(s);
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
        .filter((a) => !open.some((s) => s.sport === sportOf(a)))
        .map((a) => (
          <Link key={a.activity_id} href={`/training/einheit/${a.activity_id}`} className="card-row list-line unit-link">
            <span className="row-strong">
              <i className="dot" style={{ background: SPORTS[sportOf(a)].color }} />
              {activityLabel(a)}
            </span>
            <span className="meta">
              {durationText(a.duration_s)} · Garmin
              <span className="row-chev" aria-hidden="true">›</span>
            </span>
          </Link>
        ))}
      {children}
    </div>
  );
}
