import { useMemo, useState } from "react";
import { tipDate } from "@/components/charts/pick";
import { LineBand, RangeRow, SleepStagesBar, ValueHeader } from "@/components/charts";
import PhaseCompare from "@/components/verlauf/PhaseCompare";
import { CYCLE_SENSITIVE, metricBaseline, metricRangeSeries, phaseRange, RANGE_PHASE_NAMES, seriesOf, type Range } from "@/lib/baseline";
import { korridorLines } from "@/lib/korridor";
import { labelOf, type Habit } from "@/lib/habits";
import { cycleLengths, cycleToday, groupOf, phaseInsight, phaseMeans } from "@/lib/cycle";
import { daysAgo, isoDay } from "@/lib/dates";
import { METRICS, type Activity, type Daily, type MetricKey } from "@/lib/garmin";
import type { Diary } from "@/lib/insights";
import { axisLabels, buildPoints, spanDays, spanOf, summarize, type Span } from "@/lib/verlauf";

export const HISTORY = 180; // Phasenvergleich: immer die letzten 6 Monate
const SLEEP: MetricKey[] = ["schlaf", "tiefschlaf", "rem", "einschlafen"];
const TRAINING: MetricKey[] = ["schritte", "bb", "bb_aufgeladen", "belastung", "alltagsschritte"];
// Farbfamilien nach docs/farb-und-designkonzept.md: Energie und Ruhepuls Sage hell, Atemfrequenz neutral
export const metricTone = (k: MetricKey) =>
  SLEEP.includes(k) ? "sleep" : k === "stress" || k === "stress_hoch" ? "stress" : TRAINING.includes(k) ? "training" : k === "bb" || k === "bb_aufgeladen" || k === "ruhepuls" ? "energy" : k === "atem" ? "neutral" : "recovery";

const KORRIDOR_DAYS = 181; // Abschnitt „Dein Bereich“: letztes Halbjahr
const NIGHT: MetricKey[] = ["schlaf", "hrv", "ruhepuls", "atem", "bb", "tiefschlaf", "rem", "einschlafen", "bb_aufgeladen"]; // Werte der Nacht, dem Aufwachtag zugeordnet
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const avgRange = (rs: Range[]): Range | null =>
  rs.length ? { lo: rs.reduce((a, r) => a + r.lo, 0) / rs.length, hi: rs.reduce((a, r) => a + r.hi, 0) / rs.length, median: rs.reduce((a, r) => a + r.median, 0) / rs.length, n: rs.length, stable: rs.every((r) => r.stable) } : null;

type Props = { metric: MetricKey; span: Span; rows: Daily[]; diary: Diary[]; acts: Activity[]; sick: Set<string>; habits: Habit[] };

// Karten der Detailansicht: Satz, Zahl, Bereich, Grafik · Dein Bereich · Highlights · Vergleich nach Zyklusphase. Ohne Netzwerk.
// Der Bereich wandert im Diagramm mit: je Tag der Bereich, der damals galt (je Zyklusphase, ohne Krankheitstage).
export default function VerlaufDetail({ metric, span, rows, diary, acts, sick, habits }: Props) {
  const today = isoDay();
  const [bandMode, setBandMode] = useState<"zeit" | "heute">("zeit");
  const ctx = useMemo(() => ({ diary, sick }), [diary, sick]);
  const m = METRICS[metric];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const value = (d: string) => {
    const r = byDay.get(d);
    return r ? m.value(r) : null;
  };
  const base = metricBaseline(metric, rows, ctx, today);
  const phaseName = base.phase && base.phaseKey ? RANGE_PHASE_NAMES[base.phaseKey] : undefined;
  const points = buildPoints(span, today, value);
  const weekly = spanOf(span).weekly;
  const days = spanDays(span, today);

  // Wandernder Korridor: Bereich je Tag für den Zeitraum und das letzte Halbjahr
  const bandMap = useMemo(() => {
    const n = Math.max(spanOf(span).days, KORRIDOR_DAYS);
    const list = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
    const rs = metricRangeSeries(metric, rows, ctx, list);
    return new Map(list.map((d, i) => [d, rs[i]]));
  }, [metric, rows, ctx, span, today]);
  const pointBands = points.map((p) => {
    if (!weekly) return bandMap.get(p.day) ?? null;
    const week = Array.from({ length: 7 }, (_, i) => bandMap.get(addDays(p.day, i))).filter((r): r is Range => !!r);
    return avgRange(week);
  });
  const lines = useMemo(
    () =>
      korridorLines({
        series: seriesOf(metric, rows),
        bands: bandMap,
        today,
        higherIsBetter: METRICS[metric].higherIsBetter,
        fmt: METRICS[metric].fmt,
        diary,
        daily: rows,
        acts,
        sick,
        nightValue: NIGHT.includes(metric),
        habitLabel: (k) => labelOf(habits, k),
      }),
    [metric, rows, bandMap, today, diary, acts, sick, habits],
  );
  const sweat = new Set(diary.filter((e) => (e.symptoms?.nacht ?? 0) > 0).map((e) => e.day));
  const sweatNights = days.filter((d) => sweat.has(d)).length;
  // Jeder Tag zählt gegen den Bereich, der an diesem Tag galt
  const rangeFor = (d: string) => bandMap.get(d) ?? null;
  const sum = summarize(span, points, base.active, rangeFor, m.fmt, m.label, metric === "schlaf" ? sweatNights : 0);
  const phases = weekly || span === "T" ? undefined : points.map((p) => groupOf(cycleToday(p.day, diary).phase));
  const hasPhase = !!phases?.some(Boolean);

  // Vergleich nach Zyklusphase: immer die letzten 6 Monate, unabhängig vom Zeitraum
  const recent = rows.filter((r) => r.day >= isoDay(daysAgo(HISTORY - 1)));
  const series = recent.map((r) => ({ day: r.day, value: m.value(r) }));
  const cycles = cycleLengths(diary).length;
  const pm = phaseMeans(series, diary);
  const phaseSentence = phaseInsight(m.label, series, diary, (v) => m.fmt(v).replace(/^\+/, ""));
  const tomorrow = addDays(today, 1);
  const phaseRanges = CYCLE_SENSITIVE.includes(metric)
    ? { menstruation: phaseRange(seriesOf(metric, rows), ctx, "menstruation", tomorrow), follikel: phaseRange(seriesOf(metric, rows), ctx, "follikel", tomorrow), luteal: phaseRange(seriesOf(metric, rows), ctx, "luteal", tomorrow) }
    : undefined;
  const moving = bandMode === "zeit" && pointBands.some(Boolean);

  const last = byDay.get(today);
  const stages =
    metric === "schlaf" && last && (last.sleep_deep_s || last.sleep_rem_s || last.sleep_light_s)
      ? { tief: (last.sleep_deep_s ?? 0) / 60, rem: (last.sleep_rem_s ?? 0) / 60, leicht: (last.sleep_light_s ?? 0) / 60, wach: (last.sleep_awake_s ?? 0) / 60 }
      : null;

  return (
    <>
      <section className="card">
        <ValueHeader
          meta={`${m.label} · ${span === "T" ? "heute" : weekly ? `${spanOf(span).name}, Wochenmittel` : `letzte ${spanOf(span).days} Tage`}`}
          sentence={sum.sentence}
          value={sum.big ? `${sum.big}` : null}
          fmt={m.fmt}
          range={base.range}
          phase={base.phase}
          phaseName={phaseName}
        >
          {span === "T" ? (
            <>
              <RangeRow label={m.label} value={value(today)} fmt={m.fmt} range={base.range} phase={base.phase} phaseName={phaseName} tone={metricTone(metric)} />
              {stages && <SleepStagesBar minutes={stages} />}
            </>
          ) : (
            <LineBand
              values={points.map((p) => p.value)}
              fmt={m.fmt}
              tone={metricTone(metric)}
              label={`${m.label}, ${spanOf(span).name}${weekly ? " als Wochenmittel" : ""}, mit deinem Bereich${moving ? ", wie er jeweils galt" : ""}`}
              band={base.range}
              phaseBand={weekly ? null : base.phase}
              bands={moving ? pointBands : undefined}
              phases={hasPhase ? phases : undefined}
              dates={weekly ? undefined : points.map((p) => p.day)}
              tipNote={weekly ? (i) => `Wochenmittel, Woche ab ${tipDate(points[i].day)}` : undefined}
              markers={metric === "schlaf" && !weekly ? points.map((p) => sweat.has(p.day)) : undefined}
              xLabels={axisLabels(points, span)}
            />
          )}
        </ValueHeader>
        <div className={`legend cb-${metricTone(metric)}`}>
          {moving ? (
            <span><i className="legend-band" />Dein Bereich, wie er jeweils galt</span>
          ) : (
            <>
              {base.range && <span><i className="legend-band" />Dein Bereich (30 Tage, mittlere Hälfte)</span>}
              {base.phase && !weekly && <span><i className="legend-luteal" />Bereich {phaseName}</span>}
            </>
          )}
          {hasPhase && (
            <>
              <span>Phasen geschätzt</span>
            </>
          )}
          {metric === "schlaf" && !weekly && sweatNights > 0 && <span><i className="legend-sweat" />Nachtschweiß</span>}
        </div>
        {span !== "T" && pointBands.some(Boolean) && (
          <div className="segmented" role="group" aria-label="Bereich im Diagramm">
            <button type="button" aria-pressed={bandMode === "zeit"} onClick={() => setBandMode("zeit")}>
              Bereich über die Zeit
            </button>
            <button type="button" aria-pressed={bandMode === "heute"} onClick={() => setBandMode("heute")}>
              Bereich heute
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <span className="meta">Dein Bereich · {m.label}</span>
        {lines.length ? (
          <>
            <h2>{lines[0].text}</h2>
            {lines.length > 1 && (
              <ul className="korridor-lines">
                {lines.slice(1).map((l) => (
                  <li key={l.key}>{l.text}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <h2>Für mehr zu deinem Bereich fehlen noch Tage mit Werten.</h2>
        )}
        <span className="meta">
          Bereich: mittlere Hälfte deiner letzten 30 Tage{CYCLE_SENSITIVE.includes(metric) ? ", bei genug Tagen je Zyklusphase aus derselben Phase früherer Zyklen" : ""}. Krankheitstage und die 3 Tage danach zählen nicht mit.
          {base.active && !base.active.stable ? " Noch vorläufig, stabil ab 14 Tagen." : ""}
        </span>
      </section>

      {sum.highlights.length > 0 && (
        <section className="card">
          <span className="meta">Highlights · {spanOf(span).name}</span>
          <div className="highlight-grid">
            {sum.highlights.map((h) => (
              <div key={h.label} className="highlight">
                <span className="meta">{h.label}</span>
                <span className="highlight-value">{h.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <span className="meta">{m.label} nach Zyklusphase · letzte 6 Monate</span>
        {cycles >= 2 ? (
          <>
            <h2>{phaseSentence ?? `${m.label}: noch zu wenige Tage je Phase für einen Vergleich.`}</h2>
            <PhaseCompare means={pm} range={base.range} ranges={phaseRanges} fmt={m.fmt} label={m.label} tone={metricTone(metric)} />
            <span className="meta">
              {cycles} Zyklen. Mindestens 3 Tage je Phase, sonst steht ein Strich.{phaseRanges && Object.values(phaseRanges).some(Boolean) ? " Band = dein Bereich in dieser Phase." : ""} Phasen sind geschätzt. Ein Zusammenhang, keine Diagnose.
            </span>
          </>
        ) : (
          <p>Der Vergleich erscheint, sobald zwei ganze Zyklen im Tagebuch stehen.</p>
        )}
      </section>

    </>
  );
}
