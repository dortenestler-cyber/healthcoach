"use client";

import { markAutoRows } from "@/lib/insights";
import { useRefresh } from "@/lib/refresh";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { METRICS, OPTIONAL_METRICS, syncGarmin, type Activity, type Daily, type MetricKey } from "@/lib/garmin";
import { sickDays } from "@/lib/baseline";
import { DEFAULT_HABITS, loadHabits, type Habit } from "@/lib/habits";
import PageHead from "@/components/PageHead";
import DieserMonat from "@/components/wert/DieserMonat";
import { useAbschnitte } from "@/components/ui/Pille";
import type { VerlaufAbschnitt } from "@/components/verlauf/VerlaufDetail";
import { useRouter } from "next/navigation";
import VerlaufDetail, { HISTORY } from "@/components/verlauf/VerlaufDetail";
import VerlaufGroup, { GROUPS, groupOfMetric, type GroupKey } from "@/components/verlauf/VerlaufGroup";
import { spanOf, type Span } from "@/lib/verlauf";
import SpanSwitch from "@/components/ui/SpanSwitch";
import { STANDARD } from "@/lib/zeitraum";
import type { Diary } from "@/lib/insights";
import { loadGarminCycles, mergeGarminCycles } from "@/lib/garminZyklus";

// Verlauf: vier Gruppen mit kleinen Charts (Sammelliste Punkt 16), Tippen öffnet die Detailansicht eines Werts:
// Zeitraum T · W · M · 6M · J, persönlicher Bereich als Band, Zyklusphasen, Vergleich nach Zyklusphase und Highlights. Ab 6M Wochenmittel.
// Mit ?m=<Wert> öffnet die Seite direkt die Detailansicht (Links von Heute, Zyklus usw.).
// mode „uebersicht“: Gruppen, Tippen öffnet /wert/<Wert>. „wert“: ein Wert als eigene Seite (Wert-Seite, Konzept Bündeln Baustein 3).
// „eingebettet“: unter einer Detailseite mit Ring (Schlaf, Stress, Belastung), ohne Seitenkopf.
export default function VerlaufView({ initial, mode = "uebersicht" }: { initial: string | null; mode?: "uebersicht" | "wert" | "eingebettet" }) {
  // Unter einer Detailseite (Schlaf, Stress, Belastung): Abschnitte per Pillen, Kurve und Bereich zuerst an (Konzept Einfach, Paket 8)
  const abschnitte = useAbschnitte<VerlaufAbschnitt>(
    `wert.${initial ?? "x"}`,
    [
      ["kurve", "Kurve"],
      ["bereich", "Bereich"],
      ["phasen", "Phasen"],
      ["monat", "Monat"],
    ],
    mode === "eingebettet" ? ["kurve", "bereich"] : ["kurve", "bereich", "phasen", "monat"],
  );
  const zeigt = mode === "eingebettet" ? abschnitte.zeigt : () => true;
  const router = useRouter();
  const start = initial && initial in METRICS ? (initial as MetricKey) : null;
  const [metric, setMetric] = useState<MetricKey | null>(start);
  const [group, setGroup] = useState<GroupKey>(start ? groupOfMetric(start) : "herz");
  const [span, setSpan] = useState<Span>("30T");
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
      sb.from("diary_entries").select("*").gte("day", diaryFrom).order("day"),
      loadGarminCycles(sb, diaryFrom),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", from),
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
    setDiary(mergeGarminCycles(markAutoRows(((d.data ?? []) as (Diary & { manual?: boolean })[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] }))), gc));
  }, [need]);

  useEffect(() => {
    load();
  }, [load]);
  useRefresh(load);

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

  // Werte ohne Daten (z. B. Atemfrequenz, Schritte im Alltag) nur zeigen, wenn es sie gibt
  const available = (list: MetricKey[]) => list.filter((k) => !OPTIONAL_METRICS.includes(k) || metric === k || rows.some((r) => METRICS[k].value(r) !== null));

  const oldest = rows[0]?.day;
  const missingHistory = spanOf(span).days > 30 && (!oldest || oldest > isoDay(daysAgo(spanOf(span).days - 8)));

  const ctx = { diary, sick };
  if (mode !== "uebersicht" && metric) {
    return (
      <>
        {mode === "wert" ? (
          <>
            <Link href="/verlauf" className="back-link">‹ Alle Werte</Link>
            <PageHead title={METRICS[metric].label} />
          </>
        ) : (
          <h2 className="sec-title" id="verlauf">{METRICS[metric].label} über die Zeit</h2>
        )}
        {error && <p className="alert" role="alert">{error}</p>}
        {mode === "eingebettet" && abschnitte.zeile}
        {zeigt("kurve") && <SpanSwitch value={span} onChange={setSpan} options={["heute", ...STANDARD]} />}
        <VerlaufDetail metric={metric} span={span} rows={rows} diary={diary} acts={acts} sick={sick} habits={habits} zeigt={zeigt} />
        {zeigt("monat") && <DieserMonat metric={metric} rows={rows} ctx={ctx} today={isoDay()} />}
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

  return (
    <>
      <Link href="/" className="back-link">‹ Heute</Link>
      <PageHead title="Verlauf" />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="segmented" role="group" aria-label="Gruppe">
        {GROUPS.map((g) => (
          <button key={g.key} type="button" aria-pressed={group === g.key && !metric} aria-label={g.name} onClick={() => { setGroup(g.key); setMetric(null); }}>
            {g.label}
          </button>
        ))}
      </div>

      <SpanSwitch value={span} onChange={setSpan} options={["heute", ...STANDARD]} />

      <VerlaufGroup group={group} span={span} rows={rows} diary={diary} sick={sick} metrics={available(GROUPS.find((g) => g.key === group)!.metrics)} onOpen={(k) => router.push(`/wert/${k}`)} />

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
