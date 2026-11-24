"use client";

// Belastung über die Zeit (Konzept docs/konzept-belastung-ueber-zeit.md): Cardio und Muskeln,
// Wert der letzten 7 Tage als Linie mit Punkten je Zustand, optimaler Bereich als Band, Leiste für die Kalibrier-Tage.
// Ersetzt „Last und Korridor“ (Nutzerin 24.11.).

import { useEffect, useMemo, useState } from "react";
import { grownHeight, linear, monotoneCurve, niceTicks, segments } from "@/components/charts/scale";
import { useChartWidth } from "@/components/charts/useChartWidth";
import { ChartTip, tipDate, usePick } from "@/components/charts/pick";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import type { Data } from "@/lib/insights";
import {
  cardioPerDay,
  lastUnitText,
  musclePerDay,
  series,
  tiredCheck,
  verteilung,
  zustandSatz,
  ZUSTAND_NAMEN,
  ZUSTAND_REIHE,
  type KbSet,
  type MuscleUnit,
  type ZeitPunkt,
} from "@/lib/belastungZeit";

const SPANS = [
  { key: "7 T", days: 7, name: "7 Tage" },
  { key: "30 T", days: 30, name: "30 Tage" },
  { key: "3 M", days: 90, name: "3 Monate" },
  { key: "6 M", days: 150, name: "6 Monate" },
] as const;
type SpanKey = (typeof SPANS)[number]["key"];
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const H0 = 190;
const PAD_R = 40;
const PAD_T = 44; // Platz für das Schild beim Antippen
const PAD_B = 34; // Leiste und Datumszeile
const r0 = (v: number) => Math.round(v);

// Kettlebell-Sätze und eigene Anstrengung je Einheit (Spalte rpe ab Migration 20261127090000; fehlt sie, ohne)
function useMuscleInput(data: Data): { units: MuscleUnit[]; sets: KbSet[] } | null {
  const [input, setInput] = useState<{ sets: KbSet[]; rpe: Map<number, number> } | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setInput({ sets: [], rpe: new Map() });
      return;
    }
    const from = isoDay(daysAgo(179));
    Promise.all([
      sb.from("kb_sets").select("day, reps, weight_kg").gte("day", from),
      sb.from("garmin_activities").select("activity_id, rpe").gte("start_local", from).not("rpe", "is", null),
    ]).then(([s, r]) => {
      const rpe = new Map(((r.error ? [] : r.data ?? []) as { activity_id: number; rpe: number }[]).map((x) => [x.activity_id, x.rpe]));
      setInput({ sets: (s.data ?? []) as KbSet[], rpe });
    });
  }, [data]);
  return useMemo(() => (input ? { units: data.acts.map((a) => ({ ...a, rpe: input.rpe.get(a.activity_id) ?? null })), sets: input.sets } : null), [input, data]);
}

export default function BelastungZeitCard({ today, data, alltag = true }: { today: string; data: Data; alltag?: boolean }) {
  const [kind, setKind] = useState<"cardio" | "muskeln">("cardio");
  const [span, setSpan] = useState<SpanKey>("30 T");
  const muscleIn = useMuscleInput(data);
  const n = SPANS.find((s) => s.key === span)!.days;
  const days = useMemo(() => Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1))), [n, today]);

  const cardio = useMemo(() => {
    const c = cardioPerDay(data, alltag);
    return series(c.perDay, days, c.first, tiredCheck(data));
  }, [data, alltag, days]);
  const muscle = useMemo(() => {
    if (!muscleIn) return null;
    const m = musclePerDay(muscleIn.units, muscleIn.sets);
    const pts = series(m.perDay, days, m.first);
    const estimated = days.some((d) => m.days.get(d)?.estimated);
    return { pts, last: m.last, estimated };
  }, [muscleIn, days]);

  const pts: ZeitPunkt[] = kind === "cardio" ? cardio : (muscle?.pts ?? []);
  const unit = kind === "cardio" ? " %" : "";
  const now = pts[pts.length - 1] ?? null;

  const { ref, w: W } = useChartWidth();
  const H = grownHeight(H0, W);
  const step = (W - PAD_R - 4) / Math.max(1, n);
  const x = (i: number) => 4 + (i + 0.5) * step;
  const vals = pts.flatMap((p) => [p.value, p.hi]).filter((v): v is number => v !== null);
  // Achse vom kleinsten Wert an (nicht von 0), damit sich Änderungen ablesen lassen
  const lowAll = vals.length ? Math.min(...vals, ...pts.map((p) => p.lo).filter((v): v is number => v !== null)) : 0;
  const ticks = niceTicks(Math.max(0, lowAll * 0.75), Math.max(kind === "cardio" ? 20 : 10, ...vals));
  const y = linear(ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1, H - PAD_B, PAD_T);
  const line = segments(pts.map((p, i) => (p.value === null ? null : { x: x(i), y: y(p.value) })));
  const bandTop = pts.flatMap((p, i) => (p.hi === null ? [] : [{ x: x(i), y: y(p.hi) }]));
  const bandBot = pts.flatMap((p, i) => (p.lo === null ? [] : [{ x: x(i), y: y(p.lo) }])).reverse();
  const pick = usePick(n, 4, step, W);
  const sel = pick.sel;
  const dotR = n > 90 ? 0 : n > 30 ? 2.5 : 4;
  const dist = verteilung(pts);
  const label = kind === "cardio" ? "Cardio-Belastung" : "Muskelbelastung";
  const sentence = kind === "muskeln" && !muscle ? "Lädt …" : zustandSatz(now?.zustand ?? null, kind);

  const tipLines = (p: ZeitPunkt): string[] => [
    `${tipDate(p.day)} · ${p.value === null ? "kein Wert" : r0(p.value) + unit}`,
    p.zustand ? `${ZUSTAND_NAMEN[p.zustand]}${p.lo !== null ? ` · optimal ${r0(p.lo)}–${r0(p.hi!)}` : ""}` : "keine Daten",
  ];

  return (
    <section className="card bz-card">
      <span className="eyebrow">Belastung über die Zeit</span>
      <h2>{sentence}</h2>
      <div className="segmented" role="group" aria-label="Welche Belastung">
        <button type="button" aria-pressed={kind === "cardio"} onClick={() => setKind("cardio")}>Cardio</button>
        <button type="button" aria-pressed={kind === "muskeln"} onClick={() => setKind("muskeln")}>Muskeln</button>
      </div>

      <div className="bz-head">
        <div>
          <span className="bz-value">{now?.value != null ? r0(now.value) : "–"}<small>{now?.value != null ? unit : ""}</small></span>
          <span className="meta">{label} · Schnitt der letzten 7 Tage</span>
        </div>
        <div className="bz-head-right">
          {now?.zustand && <span className={`bz-word bz-${now.zustand}`}>{ZUSTAND_NAMEN[now.zustand]}</span>}
          {now?.lo != null && <span className="meta">Optimal: {r0(now.lo)}–{r0(now.hi!)}{unit}</span>}
        </div>
      </div>

      <svg
        ref={ref}
        className="cb cb-training cb-pickable"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} über ${SPANS.find((s) => s.key === span)!.name}: heute ${now?.value != null ? r0(now.value) + unit : "kein Wert"}${now?.zustand ? `, ${ZUSTAND_NAMEN[now.zustand]}` : ""}${now?.lo != null ? `, optimal ${r0(now.lo)} bis ${r0(now.hi!)}` : ""}`}
        {...pick.handlers}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="cb-grid" />
            <text x={W - PAD_R + 6} y={y(t) + 4} className="cb-tick">{t}</text>
          </g>
        ))}
        {bandTop.length > 1 && <path d={`M${monotoneCurve(bandTop)}L${monotoneCurve(bandBot)}Z`} className="cb-zone" />}
        {line.map((p, i) => <polyline key={i} points={p} className="cb-line bz-line" />)}
        {dotR > 0 && pts.map((p, i) => (p.value === null || !p.zustand ? null : <circle key={p.day} cx={x(i)} cy={y(p.value)} r={dotR} className={`bz-dot bz-${p.zustand}`} />))}
        {now?.value != null && now.zustand && <circle cx={x(n - 1)} cy={y(now.value)} r={6} className={`bz-dot bz-dot-now bz-${now.zustand}`} />}
        {/* Leiste: hell = eingeordnet, grau = Kalibrieren */}
        {pts.map((p, i) => (p.zustand ? <rect key={"s" + p.day} x={x(i) - step / 2 + 0.5} width={Math.max(1, step - 1)} y={H - PAD_B + 6} height={4} rx={2} className={p.zustand === "kalibrieren" ? "bz-strip-cal" : "bz-strip-ok"} /> : null))}
        <text x={x(0) - step / 2} y={H - 4} className="cb-tick">{short(days[0])}</text>
        {n > 7 && <text x={x(Math.floor((n - 1) / 2))} y={H - 4} textAnchor="middle" className="cb-tick">{short(days[Math.floor((n - 1) / 2)])}</text>}
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="cb-tick cb-tick-strong">heute</text>
        {sel !== null && pts[sel] && (
          <g aria-hidden="true">
            <rect x={4 + sel * step} y={PAD_T - 4} width={step} height={H - PAD_B - PAD_T + 4} rx={4} className="cb-pick-col" />
            <ChartTip w={W} x={x(sel)} lines={tipLines(pts[sel])} />
          </g>
        )}
      </svg>

      <div className="segmented" role="group" aria-label="Zeitraum">
        {SPANS.map((s) => (
          <button key={s.key} type="button" aria-pressed={span === s.key} aria-label={s.name} onClick={() => setSpan(s.key)}>
            {s.key}
          </button>
        ))}
      </div>

      <div className="legend cb-training">
        {ZUSTAND_REIHE.map((z) => (
          <span key={z}><i className={`bz-key bz-${z}`} />{ZUSTAND_NAMEN[z]}</span>
        ))}
        <span><i className="cb-key-zone" />Optimaler Bereich aus den 4 Wochen davor</span>
      </div>

      {kind === "cardio" && <p className="meta">Schnitt deiner Tagesbelastung{alltag ? " mit Alltag" : ", nur Training"}. Müde heißt: HRV unter oder Ruhepuls über deinem Bereich, seit 2 Tagen.</p>}
      {kind === "muskeln" && muscle && (
        <p className="meta">
          {[lastUnitText(muscle.last, today), "Aus Kettlebell-Sätzen, Bouldern und Karate (halb).", muscle.estimated ? "Einheiten ohne eingetragene Anstrengung zählen mit 5 von 10." : null].filter(Boolean).join(" ")}
        </p>
      )}

      {dist.length > 0 && (
        <div className="bz-dist">
          <span className="eyebrow">So verteilt sich der Zeitraum</span>
          {dist.map((r) => (
            <div key={r.zustand} className="bz-dist-row">
              <span className="bz-dist-name"><i className={`bz-key bz-${r.zustand}`} />{ZUSTAND_NAMEN[r.zustand]}</span>
              <span className="bz-dist-days">{r.tage} T</span>
              <span className="bz-dist-bar" aria-hidden="true"><span className={`bz-fill bz-${r.zustand}`} style={{ width: `${Math.max(2, r.anteil * 100)}%` }} /></span>
              <span className="bz-dist-pct">{Math.round(r.anteil * 100)} %</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
