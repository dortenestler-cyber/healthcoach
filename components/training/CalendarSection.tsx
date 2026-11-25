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
import Monatskalender, { type Ebene, type Punkt, type ZeichenEbene } from "@/components/kalender/Monatskalender";
import { personalRange, seriesOf } from "@/lib/baseline";
import Tagesblatt from "@/components/tag/Tagesblatt";
import TwoCol from "@/components/ui/TwoCol";
import { sportOf, SPORTS, type Session, type Sport } from "@/lib/training";

const monthBounds = (d: Date) => [isoDay(new Date(d.getFullYear(), d.getMonth(), 1)), isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))] as const;

type Span = { started_on: string; ended_on: string | null };

// ebenen/start/merken: welche Ebenen es gibt, welche zu Beginn an sind, wo die Wahl gemerkt wird.
// tag: zuerst gewählter Tag. kompakt: Tagesblatt ohne Kacheln (zentraler Kalender).
export default function CalendarSection({
  data,
  ebenen = ["training", "zyklus", "symptome"],
  start,
  merken = "training",
  tag,
  kompakt = false,
}: {
  data: Data | null;
  ebenen?: Ebene[];
  start?: Ebene[];
  merken?: string;
  tag?: string;
  kompakt?: boolean;
}) {
  const today = isoDay();
  const [[first, last], setRange] = useState<readonly [string, string]>(() => monthBounds(new Date()));
  const [selected, setSelected] = useState(tag && /^\d{4}-\d{2}-\d{2}$/.test(tag) ? tag : today);
  const [spans, setSpans] = useState<{ krank: (Span & { label: string })[]; verletzt: (Span & { spot: string })[] }>({ krank: [], verletzt: [] });
  const mitZeichen = ebenen.some((e) => ["gewohnheiten", "krank", "medikamente", "schlaf"].includes(e));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [p, a, inj, ills, injs] = await Promise.all([
      sb.from("planned_sessions").select("*").gte("day", first).lte("day", last).order("day"),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", first).lte("start_local", last + "T23:59:59"),
      sb.from("injuries").select("*").is("ended_on", null),
      mitZeichen ? sb.from("illnesses").select("label, started_on, ended_on").lte("started_on", last).or(`ended_on.is.null,ended_on.gte.${first}`) : Promise.resolve({ data: [] }),
      mitZeichen ? sb.from("injuries").select("spot, started_on, ended_on").lte("started_on", last).or(`ended_on.is.null,ended_on.gte.${first}`) : Promise.resolve({ data: [] }),
    ]);
    setSpans({ krank: (ills.data ?? []) as (Span & { label: string })[], verletzt: (injs.data ?? []) as (Span & { spot: string })[] });
    if (p.error) setError("Kalender konnte nicht geladen werden: " + p.error.message);
    setSessions((p.data ?? []) as Session[]);
    setActs((a.data ?? []) as Activity[]);
    setInjuries((inj.data ?? []) as Injury[]);
  }, [first, last, mitZeichen]);

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

  // Zeichen der weiteren Ebenen (zentraler Kalender)
  const covers = (x: Span, day: string) => x.started_on <= day && (x.ended_on === null || x.ended_on >= day);
  const diaryBy = new Map((data?.diary ?? []).map((d) => [d.day, d]));
  const hubDays = new Set((data?.hubs ?? []).map((h) => h.day));
  const schlaf = data ? seriesOf("schlaf", data.daily) : [];
  const schlafBy = new Map(schlaf.map((pt) => [pt.day, pt.value]));
  const zeichen: Partial<Record<ZeichenEbene, (day: string) => string | null>> = {
    gewohnheiten: (day) => {
      const n = diaryBy.get(day)?.influences?.length ?? 0;
      return n ? `${n} ${n === 1 ? "Gewohnheit" : "Gewohnheiten"}` : null;
    },
    krank: (day) => {
      const k = spans.krank.find((x) => covers(x, day));
      const v = spans.verletzt.find((x) => covers(x, day));
      return [k && k.label, v && `${SPOTS[v.spot]?.label ?? "verletzt"} verletzt`].filter(Boolean).join(", ") || null;
    },
    medikamente: (day) => (hubDays.has(day) ? "Bedarfs-Medikament genommen" : null),
    schlaf: (day) => {
      const v = schlafBy.get(day);
      if (v == null || day > today) return null;
      const r = personalRange(schlaf, day);
      return r && v < r.lo ? "Schlaf unter deinem Bereich" : null;
    },
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
            ebenen={ebenen}
            start={start}
            merken={merken}
            punkte={punkte}
            zeichen={mitZeichen ? zeichen : undefined}
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
            kompakt={kompakt}
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
