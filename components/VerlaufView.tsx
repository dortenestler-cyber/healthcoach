"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadPeriodDays } from "@/lib/cycle";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { METRICS, stats, syncGarmin, type Daily, type MetricKey } from "@/lib/garmin";
import PageHead from "@/components/PageHead";

const RANGES: [number, string][] = [
  [7, "7 T."],
  [30, "30 T."],
  [90, "90 T."],
  [365, "1 Jahr"],
];

// Verlauf eines Garmin-Werts mit Normalbereich und Periodentagen aus dem Tagebuch
export default function VerlaufView({ initial }: { initial: string }) {
  const [metric, setMetric] = useState<MetricKey>((initial in METRICS ? initial : "hrv") as MetricKey);
  const [range, setRange] = useState(30);
  const [rows, setRows] = useState<Daily[]>([]);
  const [periodDays, setPeriodDays] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(range - 1));
    const [g, period] = await Promise.all([
      sb.from("garmin_daily").select("*").gte("day", from).order("day"),
      loadPeriodDays(sb, from),
    ]);
    if (g.error) {
      setError("Verlauf konnte nicht geladen werden: " + g.error.message);
      return;
    }
    setRows((g.data ?? []) as Daily[]);
    setPeriodDays(period);
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
  const st = stats(present);
  const oldest = rows[0]?.day;
  const missingHistory = range > 30 && (!oldest || oldest > isoDay(daysAgo(range - 8)));

  // Diagramm 0..100 in x und y
  const lo = st ? Math.min(st.min, st.mean - st.sd) : 0;
  const hi = st ? Math.max(st.max, st.mean + st.sd) : 1;
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v: number) => 100 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * 100;
  const x = (i: number) => (range === 1 ? 50 : (i / (range - 1)) * 100);
  const points = vals.map((v, i) => (v === null ? null : `${x(i).toFixed(2)},${y(v).toFixed(2)}`)).filter(Boolean).join(" ");
  const periodRects = days.map((d, i) => (periodDays.has(d) ? i : -1)).filter((i) => i >= 0);

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

  const latest = present[present.length - 1];

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
          {periodRects.map((i) => (
            <rect key={i} x={Math.max(0, x(i) - 50 / range)} y={0} width={100 / range} height={100} className="chart-period" />
          ))}
          {st && <rect x={0} width={100} y={y(st.mean + st.sd)} height={Math.max(0.5, y(st.mean - st.sd) - y(st.mean + st.sd))} className="chart-band" />}
          {points && <polyline points={points} className="chart-line" />}
        </svg>
        <div className="card-row meta">
          <span>{shortDate(daysAgo(range - 1))}</span>
          <span>heute</span>
        </div>
        <div className="legend">
          <span><i style={{ background: "var(--accent-soft)", border: "1px solid #e7a9be" }} />Normalbereich</span>
          <span><i style={{ background: "#f2d3de" }} />Periode</span>
        </div>
        {st && (
          <p>
            Spanne {m.fmt(st.min)} bis {m.fmt(st.max)} · Normalbereich {m.fmt(st.mean - st.sd)} bis {m.fmt(st.mean + st.sd)}
          </p>
        )}
        {!present.length && <p>Für diesen Zeitraum gibt es noch keine Werte.</p>}
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
