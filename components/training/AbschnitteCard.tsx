"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { announceNewData } from "@/lib/refresh";
import type { Data } from "@/lib/insights";
import { sportOf } from "@/lib/training";
import { countWord, detect, FINE_STEP, learnScale, mmss, SEGMENT_RULES, segmentSentence, type Example } from "@/lib/abschnitte";
import { clockOf, startMinute, unitDay, unitPulse, type Unit } from "@/lib/trainingInsights";

type Source = "bestätigt" | "Kettlebell-Erfassung" | "Garmin-Satzerkennung" | "Puls";

// Abschnitte einer Einheit (freigegeben 25.11.): Versuche, Sätze, Runden oder Intervalle aus dem Puls,
// mit Plus und Minus korrigieren und bestätigen. Bestätigte Einheiten stimmen die Erkennung nach.
export default function AbschnitteCard({ unit, data, onSaved }: { unit: Unit; data: Data | null; onSaved: (n: number | null) => void }) {
  const sport = sportOf(unit);
  const rule = SEGMENT_RULES[sport];
  const [examples, setExamples] = useState<Example[] | null>(null);
  const [kbSets, setKbSets] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<number | null>(null);

  // Bestätigte Einheiten derselben Sportart, dazu bei Kettlebell die erfassten Sätze des Tages
  useEffect(() => {
    const sb = supabase();
    if (!sb || !rule) return;
    let off = false;
    sb.from("garmin_activities")
      .select("activity_id, type_key, sport_override, start_local, max_hr, hr_fine, segment_count")
      .not("segment_count", "is", null)
      .neq("activity_id", unit.activity_id)
      .order("start_local", { ascending: false })
      .limit(60)
      .then(({ data: rows }) => {
        if (off) return;
        const same = ((rows ?? []) as Unit[]).filter((r) => sportOf(r) === sport && Array.isArray(r.hr_fine) && r.hr_fine.length).slice(0, 20);
        setExamples(same.map((r) => ({ hr: r.hr_fine as (number | null)[], ...unitPulse(r, data), count: r.segment_count as number })));
      });
    if (sport === "kettlebell" && unit.start_local) {
      sb.from("kb_sets")
        .select("set_no", { count: "exact", head: true })
        .eq("day", unitDay(unit))
        .then(({ count }) => !off && setKbSets(count || null));
    }
    return () => {
      off = true;
    };
  }, [unit.activity_id, unit.start_local, sport, rule, data]);

  const { rest, max } = unitPulse(unit, data);
  const scale = useMemo(() => (rule && examples ? learnScale(rule, examples) : 1), [rule, examples]);
  const det = useMemo(() => (rule ? detect(unit.hr_fine, rule, rest, max, scale) : null), [rule, unit.hr_fine, rest, max, scale]);

  if (!rule) return null;
  const garminSets = Array.isArray(unit.garmin_sets) && unit.garmin_sets.length ? unit.garmin_sets.length : null;
  const [proposal, source]: [number | null, Source] =
    typeof unit.segment_count === "number"
      ? [unit.segment_count, "bestätigt"]
      : sport === "kettlebell" && kbSets
        ? [kbSets, "Kettlebell-Erfassung"]
        : sport === "kettlebell" && garminSets
          ? [garminSets, "Garmin-Satzerkennung"]
          : [det ? det.segments.length : null, "Puls"];

  if (proposal === null) {
    return (
      <section className="card detail-card">
        <span className="eyebrow">{rule.many}</span>
        <p className="meta">{Array.isArray(unit.hr_fine) ? "Für diese Einheit liefert Garmin keinen Puls in Sekunden." : "Der Puls in Sekunden kommt mit dem nächsten Abruf."}</p>
      </section>
    );
  }

  const shown = value ?? proposal;
  const dirty = shown !== unit.segment_count;
  const save = async (n: number | null) => {
    const sb = supabase();
    if (!sb || busy) return;
    setBusy(true);
    setMsg("");
    const { error } = await sb.from("garmin_activities").update({ segment_count: n }).eq("activity_id", unit.activity_id);
    setBusy(false);
    if (error) {
      setMsg(/segment_count/.test(error.message) ? "Die Datenbank kennt die Abschnitte noch nicht. Sie kommen mit dem nächsten Update." : "Nicht gespeichert: " + error.message);
      return;
    }
    setValue(null);
    onSaved(n);
    announceNewData();
  };

  const title = source === "Puls" ? segmentSentence(rule, shown, det) : `${countWord(rule, shown)}.`;
  const sel = pick !== null && det ? det.segments[pick] : null;
  const sm = startMinute(unit) ?? 0;
  const at = (s: number) => clockOf(sm + s / 60);

  return (
    <section className="card detail-card">
      <span className="eyebrow">{rule.many}</span>
      <h3 className="card-title-lg unit-sentence">{title}</h3>
      {det && <SegChart det={det} pick={pick} onPick={setPick} startLabel={at(0)} endLabel={at(det.smooth.length * FINE_STEP)} label={rule.one} />}
      {det && (
        <p className="meta tl-readout" aria-live="polite">
          {sel ? `${rule.one} ${pick! + 1} · ${at(sel.start)} · ${mmss(sel.peak - sel.start)} Min bis zur Spitze ${sel.peakHr} bpm${sel.drop60 !== null ? ` · nach 1 Min −${sel.drop60} bpm` : ""}` : ""}
        </p>
      )}
      {det && det.segments.length > 0 && source === "Puls" && (
        <div className="unit-tiles">
          <Tile label="Belastung Ø" value={det.workS ? mmss(det.workS) : "–"} unit="Min" />
          <Tile label="Pause Ø" value={det.restS ? mmss(det.restS) : "–"} unit="Min" />
          <Tile label="Erholung 1 Min" value={det.drop60 !== null ? `−${det.drop60}` : "–"} unit="bpm" />
          <Tile label="Spitze max" value={`${Math.max(...det.segments.map((g) => g.peakHr))}`} unit="bpm" />
        </div>
      )}
      <div className="seg-confirm">
        <button type="button" className="rpe-btn seg-step" aria-label={`Ein ${rule.one} weniger`} disabled={busy || shown <= 0} onClick={() => setValue(Math.max(0, shown - 1))}>−</button>
        <span className="seg-count" aria-live="polite">{shown}</span>
        <button type="button" className="rpe-btn seg-step" aria-label={`Ein ${rule.one} mehr`} disabled={busy || shown >= 200} onClick={() => setValue(Math.min(200, shown + 1))}>+</button>
        {dirty ? (
          <button type="button" className="btn btn-primary btn-44" disabled={busy} onClick={() => save(shown)}>Stimmt</button>
        ) : (
          <span className="chip-sm chip-ok">bestätigt</span>
        )}
      </div>
      <span className="meta">
        {source === "bestätigt" ? "" : `aus ${source === "Puls" ? "dem Puls" : source === "Kettlebell-Erfassung" ? "der Kettlebell-Erfassung" : "Garmins Satzerkennung"}`}
        {source === "bestätigt" && det ? `im Puls erkannt: ${det.segments.length}` : ""}
        {source === "bestätigt" && (
          <button type="button" className="btn btn-link" disabled={busy} onClick={() => save(null)}>Bestätigung entfernen</button>
        )}
      </span>
      {msg && <p className="meta-warn" role="alert">{msg}</p>}
    </section>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="unit-tile">
      <span className="meta">{label}</span>
      <span className="unit-tile-value">
        {value}
        {value !== "–" && <small> {unit}</small>}
      </span>
    </div>
  );
}

const W = 320;
const H = 150;
const L = 30;
const R = 8;
const T = 22;
const B = 20;

function SegChart({ det, pick, onPick, startLabel, endLabel, label }: { det: NonNullable<ReturnType<typeof detect>>; pick: number | null; onPick: (i: number | null) => void; startLabel: string; endLabel: string; label: string }) {
  const s = det.smooth;
  const vals = s.filter((v): v is number => v !== null);
  const lo = Math.max(40, Math.floor((Math.min(...vals) - 5) / 20) * 20);
  const hi = Math.ceil((Math.max(...vals) + 5) / 20) * 20;
  const bottom = H - B;
  const x = (i: number) => L + (i / Math.max(1, s.length - 1)) * (W - L - R);
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - T);
  // Linie mit Lücken, wo keine Messung ist
  const paths: string[] = [];
  let cur = "";
  s.forEach((v, i) => {
    if (v === null) {
      if (cur) paths.push(cur);
      cur = "";
      return;
    }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) paths.push(cur);
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <svg className="unit-timeline seg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Puls über die Einheit mit ${det.segments.length} markierten Spitzen`}>
      {pick !== null && det.segments[pick] && (
        <rect x={x(det.segments[pick].start / FINE_STEP)} width={Math.max(2, x(det.segments[pick].end / FINE_STEP) - x(det.segments[pick].start / FINE_STEP))} y={T - 4} height={bottom - T + 4} className="tl-peak" />
      )}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="tl-grid" />
          <text x={L - 4} y={y(v) + 3} textAnchor="end" className="tl-axis">{Math.round(v)}</text>
        </g>
      ))}
      {paths.map((d, i) => (
        <path key={i} d={d} className="seg-line" />
      ))}
      {det.segments.map((g, i) => {
        const cx = x(g.peak / FINE_STEP);
        const cy = y(g.peakHr);
        return (
          <g key={i} className="seg-mark" onClick={() => onPick(pick === i ? null : i)}>
            <circle cx={cx} cy={cy} r={pick === i ? 5 : 3.5} className="seg-dot" />
            {det.segments.length <= 30 && (
              <text x={cx} y={cy - 7} textAnchor="middle" className="seg-num">{i + 1}</text>
            )}
            <rect x={cx - 11} y={T - 4} width={22} height={bottom - T + 4} className="tl-hit">
              <title>{`${label} ${i + 1}: Spitze ${g.peakHr} bpm`}</title>
            </rect>
          </g>
        );
      })}
      <text x={L} y={H - 5} textAnchor="start" className="tl-axis">{startLabel}</text>
      <text x={W - R} y={H - 5} textAnchor="end" className="tl-axis">{endLabel}</text>
    </svg>
  );
}
