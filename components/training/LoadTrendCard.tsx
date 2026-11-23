"use client";

import { useState } from "react";
import { W, linear, niceTicks, segments } from "@/components/charts/scale";
import type { Data } from "@/lib/insights";
import { loadByDay } from "@/lib/today";
import { RATIO_HI, RATIO_LO } from "@/lib/trainingLoad";

const SPANS = [
  { key: "1M", days: 30, name: "1 Monat" },
  { key: "3M", days: 90, name: "3 Monate" },
  { key: "6M", days: 150, name: "6 Monate" },
] as const;
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const H = 180;
const PAD_R = 40;
const PAD_T = 12;
const PAD_B = 22;

// Last und Korridor über die Zeit (Konzept dunkel 2, Muster 12): Last der letzten 7 Tage je Tag als Linie,
// der Korridor (80–130 % des Wochenschnitts der 4 Wochen davor) als Band. Zeitraum 1M · 3M · 6M.
export default function LoadTrendCard({ today, data, alltag = true }: { today: string; data: Data; alltag?: boolean }) {
  const [span, setSpan] = useState<(typeof SPANS)[number]["key"]>("1M");
  const n = SPANS.find((s) => s.key === span)!.days;
  const m = loadByDay(data.acts, alltag ? data.daily : undefined);
  const sumBack = (day: string, len: number) => Array.from({ length: len }, (_, i) => m.get(addDays(day, -i)) ?? 0).reduce((a, b) => a + b, 0);
  const first = [...m.keys()].sort()[0] ?? null;
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
  const pts = days.map((d) => {
    if (!first || d < first) return { d, acute: null as number | null, lo: null as number | null, hi: null as number | null };
    const acute = sumBack(d, 7);
    const hasChronic = addDays(d, -34) >= first;
    const chronic = hasChronic ? sumBack(addDays(d, -7), 28) / 4 : null;
    return { d, acute, lo: chronic ? chronic * RATIO_LO : null, hi: chronic ? chronic * RATIO_HI : null };
  });
  const withBoth = pts.filter((p) => p.acute !== null && p.lo !== null);
  const inside = withBoth.filter((p) => (p.acute as number) >= (p.lo as number) && (p.acute as number) <= (p.hi as number)).length;
  const sentence = !withBoth.length
    ? "Der Korridor entsteht nach 5 Wochen mit Garmin-Aktivitäten."
    : `Deine Belastung lag an ${inside} von ${withBoth.length} Tagen in deinem Korridor.`;

  const vals = pts.flatMap((p) => [p.acute, p.hi]).filter((v): v is number => v !== null);
  const ticks = niceTicks(0, Math.max(10, ...vals));
  const y = linear(ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1, H - PAD_B, PAD_T);
  const x = linear(0, n - 1, 4, W - PAD_R);
  const line = segments(pts.map((p, i) => (p.acute === null ? null : { x: x(i), y: y(p.acute) })));
  const bandTop = pts.map((p, i) => (p.hi === null ? null : `${x(i).toFixed(1)},${y(p.hi).toFixed(1)}`)).filter(Boolean);
  const bandBot = pts.map((p, i) => (p.lo === null ? null : `${x(i).toFixed(1)},${y(p.lo).toFixed(1)}`)).filter(Boolean).reverse();
  const last = pts[pts.length - 1];

  return (
    <section className="card">
      <span className="eyebrow">Belastung und Korridor</span>
      <h2>{sentence}</h2>
      <div className="segmented" role="group" aria-label="Zeitraum">
        {SPANS.map((s) => (
          <button key={s.key} type="button" aria-pressed={span === s.key} aria-label={s.name} onClick={() => setSpan(s.key)}>
            {s.key}
          </button>
        ))}
      </div>
      <svg className="cb cb-training" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Belastung der letzten 7 Tage über ${SPANS.find((s) => s.key === span)!.name}, heute ${last.acute ?? "kein Wert"}${last.lo !== null ? `, Korridor ${Math.round(last.lo)} bis ${Math.round(last.hi!)}` : ""}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="cb-grid" />
            <text x={W - PAD_R + 6} y={y(t) + 4} className="cb-tick">{t}</text>
          </g>
        ))}
        {bandTop.length > 1 && <polygon points={[...bandTop, ...bandBot].join(" ")} className="cb-zone" />}
        {line.map((p, i) => <polyline key={i} points={p} className="cb-line" />)}
        {last.acute !== null && (
          <g>
            <circle cx={x(n - 1)} cy={y(last.acute)} r={5} className="cb-dot" />
            <text x={x(n - 1)} y={y(last.acute) - 10} textAnchor="end" className="cb-value">{Math.round(last.acute)}</text>
          </g>
        )}
        <text x={x(0)} y={H - 4} className="cb-tick">{short(days[0])}</text>
        <text x={x(Math.floor((n - 1) / 2))} y={H - 4} textAnchor="middle" className="cb-tick">{short(days[Math.floor((n - 1) / 2)])}</text>
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="cb-tick cb-tick-strong">heute</text>
      </svg>
      <div className="legend cb-training">
        <span><i className="cb-key-line" />Belastung der letzten 7 Tage{alltag ? " mit Alltag" : ", nur Training"}</span>
        <span><i className="cb-key-zone" />Korridor aus den 4 Wochen davor</span>
      </div>
    </section>
  );
}
