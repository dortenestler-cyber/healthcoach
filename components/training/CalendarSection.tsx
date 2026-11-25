"use client";

// Training › Kalender: gemeinsamer Monatskalender (Ebenen Training, Zyklus, Symptome) und daneben das Tagesblatt.
// Konzept docs/konzept-buendeln.md, Bausteine 1 (Tagesblatt) und 2 (Kalender mit Ebenen).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import type { Activity } from "@/lib/garmin";
import { SPOTS, type Injury } from "@/lib/health";
import type { Data } from "@/lib/insights";
import { cycleToday, dayRule, PHASES } from "@/lib/cycle";
import Monatskalender, { type Punkt } from "@/components/kalender/Monatskalender";
import Tagesblatt from "@/components/tag/Tagesblatt";
import TwoCol from "@/components/ui/TwoCol";
import { sportOf, SPORTS, type Session, type Sport } from "@/lib/training";

const monthBounds = (d: Date) => [isoDay(new Date(d.getFullYear(), d.getMonth(), 1)), isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))] as const;

export default function CalendarSection({ data }: { data: Data | null }) {
  const today = isoDay();
  const [[first, last], setRange] = useState<readonly [string, string]>(() => monthBounds(new Date()));
  const [selected, setSelected] = useState(today);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [p, a, inj] = await Promise.all([
      sb.from("planned_sessions").select("*").gte("day", first).lte("day", last).order("day"),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", first).lte("start_local", last + "T23:59:59"),
      sb.from("injuries").select("*").is("ended_on", null),
    ]);
    if (p.error) setError("Kalender konnte nicht geladen werden: " + p.error.message);
    setSessions((p.data ?? []) as Session[]);
    setActs((a.data ?? []) as Activity[]);
    setInjuries((inj.data ?? []) as Injury[]);
  }, [first, last]);

  useEffect(() => {
    load();
  }, [load]);

  if (!supabase()) return null;

  const actsOn = (day: string) => acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day);
  const sessOn = (day: string) => sessions.filter((s) => s.day === day);

  // Training je Tag: geplant hohl, erledigt (selbst oder Garmin) voll, Garmin-Einheiten ohne Plan voll
  const punkte = (day: string): Punkt[] => {
    const out: Punkt[] = [];
    const a = actsOn(day);
    for (const s of sessOn(day)) {
      if (s.status === "ausgelassen") continue;
      out.push({ key: s.id, sport: s.sport, filled: s.status === "erledigt" || a.some((x) => sportOf(x) === s.sport) });
    }
    for (const x of a) {
      const sp = sportOf(x);
      if (!sessOn(day).some((s) => s.sport === sp)) out.push({ key: String(x.activity_id), sport: sp, filled: true });
    }
    return out;
  };

  // Vorschlag im Tagesblatt: heute mit voller Regelreihenfolge, sonst nur der Phasenvorschlag
  const rehaSports = [...new Set(injuries.flatMap((i) => SPOTS[i.spot]?.sports ?? []))].map((s) => SPORTS[s as Sport]?.label ?? s);
  const selCycle = data ? cycleToday(selected, data.diary) : null;
  const rule = data && selected === today ? dayRule(today, data, rehaSports) : null;
  const dayBlock = (() => {
    if (!data || !selCycle) return null;
    const p = selCycle.phase ? PHASES[selCycle.phase] : null;
    if (rule && rule.level !== "phase") return { title: rule.title, text: rule.text, rpe: null as string | null, tone: rule.level === "reha" ? "suggest-training" : "suggest-warn" };
    if (!p) return { title: "Phase noch unbekannt", text: "Trag deine Periode im Tagebuch ein, dann kann die App die Phase schätzen.", rpe: null, tone: "" };
    return { title: selected < today ? "Vorschlag für diese Phase" : "Vorschlag", text: `${p.suggestion}. ${p.hint}`, rpe: p.rpe, tone: "suggest-cycle" };
  })();

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      {/* Am Computer Kalender und Tagesblatt nebeneinander (TwoCol), auf dem iPhone untereinander */}
      <TwoCol
        left={
          <Monatskalender
            today={today}
            diary={data?.diary ?? []}
            ebenen={["training", "zyklus", "symptome"]}
            merken="training"
            punkte={punkte}
            selected={selected}
            onPick={setSelected}
            onMonth={(f, l) => setRange([f, l])}
            maxForward={12}
          />
        }
        right={
          <Tagesblatt
            key={selected}
            day={selected}
            data={data}
            onChanged={load}
            intro={
              dayBlock && (
                <div className={"suggest " + dayBlock.tone}>
                  <span className="row-strong">{dayBlock.title}</span>
                  <span>{dayBlock.text}</span>
                  {dayBlock.rpe && <span>Anstrengung (1–10): {dayBlock.rpe}</span>}
                </div>
              )
            }
          />
        }
      />
    </>
  );
}
