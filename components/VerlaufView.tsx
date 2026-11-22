"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { METRICS, syncGarmin, type Activity, type Daily, type MetricKey } from "@/lib/garmin";
import { sickDays } from "@/lib/baseline";
import { DEFAULT_HABITS, loadHabits, type Habit } from "@/lib/habits";
import PageHead from "@/components/PageHead";
import VerlaufDetail, { HISTORY } from "@/components/verlauf/VerlaufDetail";
import { SPANS, spanOf, type Span } from "@/lib/verlauf";
import type { Diary } from "@/lib/insights";
import { loadGarminCycles, mergeGarminCycles } from "@/lib/garminZyklus";

// Detailansicht eines Garmin-Werts: Zeitraum T · W · M · 6M · J, fester persönlicher Bereich als Band,
// Zyklusphasen getönt, Vergleich nach Zyklusphase und Highlights. Ab 6M Wochenmittel.
export default function VerlaufView({ initial }: { initial: string }) {
  const [metric, setMetric] = useState<MetricKey>((initial in METRICS ? initial : "hrv") as MetricKey);
  const [span, setSpan] = useState<Span>("M");
  const [rows, setRows] = useState<Daily[]>([]);
  const [diary, setDiary] = useState<Diary[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [sick, setSick] = useState<Set<string>>(new Set());
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const need = Math.max(spanOf(span).days, HISTORY) + 31; // plus 30 Tage für den Bereich am Anfang
  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(need - 1));
    const diaryFrom = isoDay(daysAgo(need + 60));
    const [g, d, gc, a, il, hb] = await Promise.all([
      sb.from("garmin_daily").select("*").gte("day", from).order("day"),
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", diaryFrom).order("day"),
      loadGarminCycles(sb, diaryFrom),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load").gte("start_local", from),
      sb.from("illnesses").select("started_on, ended_on").or(`ended_on.is.null,ended_on.gte.${from}`),
      loadHabits(sb),
    ]);
    if (g.error) {
      setError("Verlauf konnte nicht geladen werden: " + g.error.message);
      return;
    }
    setRows((g.data ?? []) as Daily[]);
    setActs((a.data ?? []) as Activity[]);
    setSick(sickDays((il.data ?? []) as { started_on: string; ended_on: string | null }[], isoDay()));
    setHabits(hb);
    setDiary(mergeGarminCycles(((d.data ?? []) as Diary[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] })), gc));
  }, [need]);

  useEffect(() => {
    load();
  }, [load]);

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

  const oldest = rows[0]?.day;
  const missingHistory = spanOf(span).days > 30 && (!oldest || oldest > isoDay(daysAgo(spanOf(span).days - 8)));

  return (
    <>
      <Link href="/" className="back-link">‹ Heute</Link>
      <PageHead title="Verlauf" sub="Deine Werte über die Zeit" />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="pills scroll">
        {(Object.keys(METRICS) as MetricKey[]).filter((k) => k !== "atem" || metric === "atem" || rows.some((r) => typeof r.respiration_avg === "number")).map((k) => (
          <button key={k} type="button" className="pill" aria-pressed={metric === k} onClick={() => setMetric(k)}>
            {METRICS[k].label}
          </button>
        ))}
      </div>

      <div className="segmented segmented-5" role="group" aria-label="Zeitraum">
        {SPANS.map((s) => (
          <button key={s.key} type="button" aria-pressed={span === s.key} aria-label={s.name} onClick={() => setSpan(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <VerlaufDetail metric={metric} span={span} rows={rows} diary={diary} acts={acts} sick={sick} habits={habits} />

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
