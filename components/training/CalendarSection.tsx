"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadPeriodDays } from "@/lib/garminZyklus";
import { isoDay, longDate } from "@/lib/dates";
import type { Activity } from "@/lib/garmin";
import { SPOTS, type Injury } from "@/lib/health";
import type { Data } from "@/lib/insights";
import { cycleToday, dayRule, PHASES, type Phase } from "@/lib/cycle";
import Tagesblatt from "@/components/tag/Tagesblatt";
import { fromIso, sportOf, SPORTS, WEEKDAY_LABELS, type Session, type Sport } from "@/lib/training";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const ADDABLE: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];
const FILTERS: [Filter, string][] = [
  ["alles", "Alles"],
  ["training", "Training"],
  ["zyklus", "Zyklus"],
];
type Filter = "alles" | "training" | "zyklus";

// Drei Flächen im Kalender: Menstruation, Follikel (mit Eisprung-Fenster), Luteal
const band = (p: Phase | null) => (p === "menstruation" ? "menses" : p === "follikel" ? "follikel" : p === "eisprung" ? "eisprung" : p ? "luteal" : undefined);

export default function CalendarSection({ data }: { data: Data | null }) {
  const [filter, setFilter] = useState<Filter>("alles");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(isoDay());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [period, setPeriod] = useState<Set<string>>(new Set());
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [error, setError] = useState("");

  const first = isoDay(new Date(month.getFullYear(), month.getMonth(), 1));
  const last = isoDay(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [p, a, d, inj] = await Promise.all([
      sb.from("planned_sessions").select("*").gte("day", first).lte("day", last).order("day"),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", first).lte("start_local", last + "T23:59:59"),
      loadPeriodDays(sb, first, last),
      sb.from("injuries").select("*").is("ended_on", null),
    ]);
    if (p.error) setError("Kalender konnte nicht geladen werden: " + p.error.message);
    setSessions((p.data ?? []) as Session[]);
    setActs((a.data ?? []) as Activity[]);
    setPeriod(d);
    setInjuries((inj.data ?? []) as Injury[]);
  }, [first, last]);

  useEffect(() => {
    load();
  }, [load]);

  if (!supabase()) return null;

  const actsOn = (day: string) => acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day);
  const sessOn = (day: string) => sessions.filter((s) => s.day === day);
  const doneByGarmin = (s: Session) => actsOn(s.day).some((a) => sportOf(a) === s.sport);

  // Raster mit Montag als erstem Tag
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);

  const dotsFor = (day: string) => {
    const dots: { color: string; filled: boolean; key: string }[] = [];
    for (const s of sessOn(day)) {
      if (s.status === "ausgelassen") continue;
      const done = s.status === "erledigt" || doneByGarmin(s);
      dots.push({ key: s.id, color: SPORTS[s.sport].color, filled: done });
    }
    for (const a of actsOn(day)) {
      const sp = sportOf(a);
      if (!sessOn(day).some((s) => s.sport === sp)) dots.push({ key: String(a.activity_id), color: SPORTS[sp].color, filled: true });
    }
    return dots.slice(0, 4);
  };
  // Symptome aus dem Tagebuch: ein Amber-Punkt am Tag, wenn mindestens ein Symptom eingetragen ist
  const symptomDays = new Set((data?.diary ?? []).filter((d) => Object.values(d.symptoms ?? {}).some((v) => v > 0)).map((d) => d.day));

  const today = isoDay();
  const showPhase = filter !== "training" && !!data;
  const showDots = filter !== "zyklus";
  const phaseOf = (day: string) => (data ? cycleToday(day, data.diary).phase : null);

  // Tagesdetail: heute mit voller Regelreihenfolge, sonst nur der Phasenvorschlag
  const rehaSports = [...new Set(injuries.flatMap((i) => SPOTS[i.spot]?.sports ?? []))].map((s) => SPORTS[s as Sport]?.label ?? s);
  const selPhase = phaseOf(selected);
  const selCycle = data ? cycleToday(selected, data.diary) : null;
  const rule = data && selected === today ? dayRule(today, data, rehaSports) : null;
  const dayBlock = (() => {
    if (!data || !selCycle) return null;
    const p = selPhase ? PHASES[selPhase] : null;
    const head = selCycle.cycleDay !== null ? `Zyklustag ${selCycle.cycleDay}${p ? " · " + p.label + " (geschätzt)" : ""}` : "Zyklus: noch keine Periode im Tagebuch";
    if (rule && rule.level !== "phase") {
      const tone = rule.level === "reha" ? "suggest-training" : "suggest-warn";
      return { head, title: rule.title, text: rule.text, rpe: null as string | null, tone };
    }
    if (!p) return { head, title: "Phase noch unbekannt", text: "Trag deine Periode im Tagebuch ein, dann kann die App die Phase schätzen.", rpe: null, tone: "" };
    return { head, title: selected < today ? "Vorschlag für diese Phase" : "Vorschlag", text: `${p.suggestion}. ${p.hint}`, rpe: p.rpe, tone: "suggest-cycle" };
  })();

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <button type="button" className="btn btn-link" aria-label="Voriger Monat" onClick={() => shift(-1)}>‹</button>
          <h2>{MONTHS[month.getMonth()]} {month.getFullYear()}</h2>
          <button type="button" className="btn btn-link" aria-label="Nächster Monat" onClick={() => shift(1)}>›</button>
        </div>
        <div className="segmented segmented-3">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="cal-grid cal-head">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((day, i) =>
            day ? (
              <button
                key={day}
                type="button"
                className="cal-cell"
                data-today={day === today}
                data-selected={day === selected}
                data-period={showPhase && period.has(day)}
                data-phase={showPhase ? band(phaseOf(day)) : undefined}
                data-future={day > today}
                onClick={() => setSelected(day)}
                aria-label={longDate(fromIso(day)) + (showPhase && phaseOf(day) ? ", " + PHASES[phaseOf(day)!].label + " geschätzt" : "") + (showPhase && symptomDays.has(day) ? ", Symptome eingetragen" : "")}
              >
                <span className="cal-num">{Number(day.slice(8, 10))}</span>
                <span className="cal-dots">
                  {showDots &&
                    dotsFor(day).map((d) => (
                      <i key={d.key} style={{ borderColor: d.color, background: d.filled ? d.color : "transparent" }} />
                    ))}
                  {showPhase && symptomDays.has(day) && <i className="cal-dot-symptom" />}
                </span>
              </button>
            ) : (
              <span key={"e" + i} />
            )
          )}
        </div>
        <div className="legend">
          {showDots && (
            <>
              {ADDABLE.map((s) => (
                <span key={s}><i style={{ background: SPORTS[s].color }} />{SPORTS[s].label}</span>
              ))}
              <span><i style={{ background: "transparent", border: "1.5px solid var(--muted)" }} />geplant</span>
            </>
          )}
          {showPhase && (
            <>
              <span><i className="ph-menses-bg" />Menstruation</span>
              <span><i className="ph-follikel-bg" />Follikel</span>
              <span><i className="ph-eisprung-bg" />Eisprung</span>
              <span><i className="ph-luteal-bg" />Luteal</span>
              <span><i className="legend-period" />Periode (Tagebuch oder Garmin)</span>
              <span><i className="cal-dot-symptom legend-dot" />Symptome</span>
              <span>Phasen geschätzt, kommende Tage heller</span>
            </>
          )}
        </div>
      </section>

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
    </>
  );
}
