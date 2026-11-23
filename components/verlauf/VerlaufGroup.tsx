"use client";

// Verlauf in Gruppen (Sammelliste Punkt 16): mehrere Werte als kleine Charts mit gemeinsamer Zeitachse.
// Fährt man über einen Tag oder tippt darauf, zeigen alle Charts der Gruppe denselben Tag.
// Tippen auf die Überschrift öffnet den Wert groß (VerlaufDetail).

import { useMemo, useState } from "react";
import { LineBand, RangeRow } from "@/components/charts";
import { tipDate } from "@/components/charts/pick";
import { metricBaseline, metricRangeSeries, RANGE_PHASE_NAMES, type Range } from "@/lib/baseline";
import { cycleToday, groupOf } from "@/lib/cycle";
import { isoDay } from "@/lib/dates";
import { METRICS, type Daily, type MetricKey } from "@/lib/garmin";
import type { Diary } from "@/lib/insights";
import { axisLabels, buildPoints, spanOf, summarize, type Span } from "@/lib/verlauf";
import { metricTone } from "@/components/verlauf/VerlaufDetail";

export type GroupKey = "schlaf" | "herz" | "energie" | "bewegung";

export const GROUPS: { key: GroupKey; label: string; name: string; metrics: MetricKey[] }[] = [
  { key: "schlaf", label: "Schlaf", name: "Schlaf", metrics: ["schlaf", "tiefschlaf", "rem", "einschlafen"] },
  { key: "herz", label: "Herz", name: "Herz und Körper", metrics: ["hrv", "ruhepuls", "atem", "temperatur"] },
  { key: "energie", label: "Energie", name: "Energie und Stress", metrics: ["bb", "bb_aufgeladen", "stress", "stress_hoch"] },
  { key: "bewegung", label: "Bewegung", name: "Bewegung", metrics: ["schritte", "alltagsschritte", "belastung"] },
];

export const groupOfMetric = (m: MetricKey): GroupKey => GROUPS.find((g) => g.metrics.includes(m))?.key ?? "herz";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const avgRange = (rs: Range[]): Range | null =>
  rs.length ? { lo: rs.reduce((a, r) => a + r.lo, 0) / rs.length, hi: rs.reduce((a, r) => a + r.hi, 0) / rs.length, median: rs.reduce((a, r) => a + r.median, 0) / rs.length, n: rs.length, stable: rs.every((r) => r.stable) } : null;

type Props = { group: GroupKey; span: Span; rows: Daily[]; diary: Diary[]; sick: Set<string>; onOpen: (m: MetricKey) => void; metrics: MetricKey[] };

export default function VerlaufGroup({ group, span, rows, diary, sick, onOpen, metrics }: Props) {
  const today = isoDay();
  const [sel, setSel] = useState<number | null>(null);
  const ctx = useMemo(() => ({ diary, sick }), [diary, sick]);
  const g = GROUPS.find((x) => x.key === group)!;
  const weekly = spanOf(span).weekly;
  const byDay = useMemo(() => new Map(rows.map((r) => [r.day, r])), [rows]);

  // Tage für den wandernden Bereich: Zeitraum plus eine Woche Vorlauf für die Wochenmittel
  const dayList = useMemo(() => {
    const n = spanOf(span).days + 7;
    return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
  }, [span, today]);

  const charts = useMemo(
    () =>
      metrics.map((key) => {
        const m = METRICS[key];
        const value = (d: string) => {
          const r = byDay.get(d);
          return r ? m.value(r) : null;
        };
        const points = buildPoints(span, today, value);
        const rs = metricRangeSeries(key, rows, ctx, dayList);
        const bandMap = new Map(dayList.map((d, i) => [d, rs[i]]));
        const bands = points.map((p) => {
          if (!weekly) return bandMap.get(p.day) ?? null;
          return avgRange(Array.from({ length: 7 }, (_, i) => bandMap.get(addDays(p.day, i))).filter((r): r is Range => !!r));
        });
        const base = metricBaseline(key, rows, ctx, today);
        const sum = summarize(span, points, base.active, (d) => bandMap.get(d) ?? null, m.fmt, m.label, 0);
        return { key, m, points, bands, base, sum, value };
      }),
    [metrics, byDay, span, today, rows, ctx, dayList, weekly],
  );

  const first = charts[0];
  const phases = !first || weekly || span === "T" ? undefined : first.points.map((p) => groupOf(cycleToday(p.day, diary).phase));
  const hasPhase = !!phases?.some(Boolean);

  return (
    <>
      <p className="meta verlauf-group-note">
        {g.name} · {span === "T" ? "heute" : weekly ? `${spanOf(span).name}, Wochenmittel` : `letzte ${spanOf(span).days} Tage`}. Tippen auf einen Tag zeigt ihn in allen Charts, auf eine Überschrift öffnet den Wert groß.
      </p>
      <div className="verlauf-grid">
        {charts.map((c) => (
          <section key={c.key} className="card verlauf-mini">
            <button type="button" className="verlauf-mini-head" onClick={() => onOpen(c.key)}>
              <span className="meta">{c.m.label}</span>
              <span className="verlauf-mini-sentence">{c.sum.sentence}</span>
              <span className="verlauf-mini-more" aria-hidden="true">›</span>
            </button>
            {span === "T" ? (
              <RangeRow
                label={c.m.label}
                value={c.value(today)}
                fmt={c.m.fmt}
                range={c.base.range}
                phase={c.base.phase}
                phaseName={c.base.phaseKey ? RANGE_PHASE_NAMES[c.base.phaseKey] : undefined}
                tone={metricTone(c.key)}
              />
            ) : (
              <LineBand
                values={c.points.map((p) => p.value)}
                fmt={c.m.fmt}
                tone={metricTone(c.key)}
                height={120}
                label={`${c.m.label}, ${spanOf(span).name}${weekly ? " als Wochenmittel" : ""}, mit deinem Bereich`}
                band={c.base.range}
                bands={c.bands.some(Boolean) ? c.bands : undefined}
                phases={hasPhase ? phases : undefined}
                dates={weekly ? undefined : c.points.map((p) => p.day)}
                tipNote={weekly ? (i) => `Wochenmittel, Woche ab ${tipDate(c.points[i].day)}` : undefined}
                zeroLine={c.key === "temperatur"}
                xLabels={axisLabels(c.points, span)}
                shared={{ sel, setSel }}
              />
            )}
          </section>
        ))}
      </div>
      {span !== "T" && (
        <div className="legend">
          <span><i className="legend-band" />Dein Bereich, wie er jeweils galt</span>
          {hasPhase && <span>Phasen geschätzt</span>}
        </div>
      )}
    </>
  );
}
