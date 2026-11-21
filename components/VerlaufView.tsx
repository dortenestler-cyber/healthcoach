"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { METRICS, stats, syncGarmin, type Daily, type MetricKey } from "@/lib/garmin";
import PageHead from "@/components/PageHead";
import { cycleLengths, cycleToday, groupOf, phaseInsight, phaseMeans, PHASE_GROUPS } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";

// Für Phasen und Muster mindestens ein halbes Jahr laden
const HISTORY = 180;

const RANGES: [number, string][] = [
  [7, "7 T."],
  [30, "30 T."],
  [90, "90 T."],
  [365, "1 Jahr"],
];

// Verlauf eines Garmin-Werts mit Normalbereich, Phasenband und Nachtschweiß aus dem Tagebuch
export default function VerlaufView({ initial }: { initial: string }) {
  const [metric, setMetric] = useState<MetricKey>((initial in METRICS ? initial : "hrv") as MetricKey);
  const [range, setRange] = useState(30);
  const [rows, setRows] = useState<Daily[]>([]);
  const [diary, setDiary] = useState<Diary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(Math.max(range, HISTORY) - 1));
    const diaryFrom = isoDay(daysAgo(Math.max(range, HISTORY) + 60));
    const [g, d] = await Promise.all([
      sb.from("garmin_daily").select("*").gte("day", from).order("day"),
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", diaryFrom).order("day"),
    ]);
    if (g.error) {
      setError("Verlauf konnte nicht geladen werden: " + g.error.message);
      return;
    }
    setRows((g.data ?? []) as Daily[]);
    setDiary(((d.data ?? []) as Diary[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] })));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const m = METRICS[metric];
  const days = Array.from({ length: range }, (_, i) => isoDay(daysAgo(range - 1 - i)));
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const vals = days.map((d) => {
    const r = byDay.get(d);
    return r ? m.value(r) : null;
  });
  const present = vals.filter((v): v is number => v !== null);
  const latest = present[present.length - 1];
  const st = stats(present);
  const oldest = rows[0]?.day;
  const sweatDays = new Set(diary.filter((e) => (e.symptoms?.nacht ?? 0) > 0).map((e) => e.day));
  const phases = days.map((d) => groupOf(cycleToday(d, diary).phase));
  const hasPhase = phases.some(Boolean);
  const series = rows.map((r) => ({ day: r.day, value: m.value(r) }));
  const fmtDiff = (v: number) => m.fmt(v).replace(/^\+/, "");
  const insight =
    phaseInsight(m.label, series, diary, fmtDiff) ??
    (latest === undefined || !st
      ? `${m.label}: noch zu wenige Werte für eine Aussage.`
      : Math.abs(latest - st.mean) <= st.sd
        ? `${m.label} liegt zuletzt im Normalbereich.`
        : `${m.label} liegt zuletzt ${latest > st.mean ? "über" : "unter"} dem Normalbereich.`);
  const cycles = cycleLengths(diary).length;
  const pattern = cycles >= 2
    ? (["hrv", "schlaf", "temperatur", "ruhepuls"] as MetricKey[]).map((k) => ({
        k,
        pm: phaseMeans(rows.map((r) => ({ day: r.day, value: METRICS[k].value(r) })), diary),
      }))
    : [];
  const missingHistory = range > 30 && (!oldest || oldest > isoDay(daysAgo(range - 8)));

  // Diagramm 0..100 in x und y
  const lo = st ? Math.min(st.min, st.mean - st.sd) : 0;
  const hi = st ? Math.max(st.max, st.mean + st.sd) : 1;
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v: number) => 100 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * 100;
  const x = (i: number) => (range === 1 ? 50 : (i / (range - 1)) * 100);
  const points = vals.map((v, i) => (v === null ? null : `${x(i).toFixed(2)},${y(v).toFixed(2)}`)).filter(Boolean).join(" ");

  const loadYear = async () => {
    setBusy(true);
    setError("");
    // In Stücken zu 90 Tagen, damit keine Abfrage zu lange dauert
    for (const offset of [0, 90, 180, 270]) {
      const res = await syncGarmin(offset === 270 ? 95 : 90, offset);
      if (!res.ok) {
        setError("Laden hat nicht geklappt: " + res.error);
        break;
      }
    }
    setBusy(false);
    load();
  };


  return (
    <>
      <Link href="/" className="back-link">‹ Heute</Link>
      <PageHead title="Verlauf" sub="Deine Werte über die Zeit" />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="pills scroll">
        {(Object.keys(METRICS) as MetricKey[]).map((k) => (
          <button key={k} type="button" className="pill" aria-pressed={metric === k} onClick={() => setMetric(k)}>
            {METRICS[k].label}
          </button>
        ))}
      </div>

      <div className="segmented">
        {RANGES.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={range === v} onClick={() => setRange(v)}>
            {l}
          </button>
        ))}
      </div>

      <section className="card">
        <h2>{insight}</h2>
        <div className="card-row">
          <div className="stack">
            <span className="meta">{m.label} zuletzt</span>
            <span className="big-number">{latest === undefined ? "–" : m.fmt(latest)}</span>
          </div>
          <div className="stack right">
            <span className="meta">Schnitt</span>
            <span className="row-strong">{st ? m.fmt(st.mean) : "–"}</span>
          </div>
        </div>
        <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${m.label} der letzten ${range} Tage`}>
          {phases.map((g, i) =>
            g ? <rect key={i} x={Math.max(0, x(i) - 50 / range)} y={0} width={100 / range + 0.05} height={100} className={"ph-" + (g === "menstruation" ? "menses" : g)} /> : null
          )}
          {st && (
            <>
              <line x1={0} x2={100} y1={y(st.mean + st.sd)} y2={y(st.mean + st.sd)} className="chart-norm" />
              <line x1={0} x2={100} y1={y(st.mean - st.sd)} y2={y(st.mean - st.sd)} className="chart-norm" />
            </>
          )}
          {points && <polyline points={points} className="chart-line" />}
          {days.map((d, i) => (sweatDays.has(d) ? <line key={"s" + d} x1={x(i)} x2={x(i)} y1={0} y2={9} className="chart-sweat" /> : null))}
        </svg>
        <div className="card-row meta">
          <span>{shortDate(daysAgo(range - 1))}</span>
          <span>heute</span>
        </div>
        <div className="legend">
          <span><i className="legend-norm" />Normalbereich</span>
          {hasPhase && (
            <>
              <span><i className="ph-menses-bg" />Menstruation</span>
              <span><i className="ph-follikel-bg" />Follikel</span>
              <span><i className="ph-luteal-bg" />Luteal</span>
            </>
          )}
          {sweatDays.size > 0 && <span><i className="legend-sweat" />Nachtschweiß</span>}
          {hasPhase && <span>Phasen geschätzt</span>}
        </div>
        {st && (
          <p>
            Spanne {m.fmt(st.min)} bis {m.fmt(st.max)} · Normalbereich {m.fmt(st.mean - st.sd)} bis {m.fmt(st.mean + st.sd)}
          </p>
        )}
        {!present.length && (
          <p>{metric === "temperatur" ? "Noch keine Hauttemperatur. Sie kommt mit dem nächsten Garmin-Abruf, wenn deine Uhr sie nachts misst." : "Für diesen Zeitraum gibt es noch keine Werte."}</p>
        )}
      </section>

      <section className="card">
        <h2>Muster über deinen Zyklus</h2>
        {pattern.length ? (
          <>
            <div className="pattern-grid" role="table" aria-label="Schnitt je Zyklusphase">
              <span role="columnheader" />
              {PHASE_GROUPS.map(([g, l]) => (
                <span key={g} role="columnheader" className="meta">{l}</span>
              ))}
              {pattern.map(({ k, pm }) => (
                <div key={k} role="row" className="pattern-row">
                  <span role="rowheader" className="row-strong">{METRICS[k].label}</span>
                  {PHASE_GROUPS.map(([g]) => (
                    <span key={g} role="cell">{pm[g].mean === null || pm[g].n < 3 ? "–" : METRICS[k].fmt(pm[g].mean)}</span>
                  ))}
                </div>
              ))}
            </div>
            <span className="meta">Schnitt der letzten 6 Monate aus {cycles} Zyklen. Phasen sind geschätzt. Ein Muster, keine Diagnose.</span>
          </>
        ) : (
          <p>Das Muster erscheint, sobald zwei ganze Zyklen im Tagebuch stehen.</p>
        )}
      </section>

      {missingHistory && (
        <section className="card">
          <h2>Ältere Daten fehlen</h2>
          <p>Bisher sind nur die letzten Wochen geladen. Willst du ein ganzes Jahr von Garmin holen? Das dauert etwa eine Minute.</p>
          <button type="button" className="btn btn-dark" disabled={busy} onClick={loadYear}>
            {busy ? "Lädt …" : "Ein Jahr laden"}
          </button>
        </section>
      )}
    </>
  );
}
