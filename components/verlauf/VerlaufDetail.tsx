import { LineBand, RangeRow, SleepStagesBar, ValueHeader } from "@/components/charts";
import PhaseCompare from "@/components/verlauf/PhaseCompare";
import { metricBaseline } from "@/lib/baseline";
import { cycleLengths, cycleToday, groupOf, phaseInsight, phaseMeans } from "@/lib/cycle";
import { daysAgo, isoDay } from "@/lib/dates";
import { METRICS, type Daily, type MetricKey } from "@/lib/garmin";
import type { Diary } from "@/lib/insights";
import { axisLabels, buildPoints, spanDays, spanOf, summarize, type Span } from "@/lib/verlauf";

export const HISTORY = 180; // Phasenvergleich: immer die letzten 6 Monate
const tone = (k: MetricKey) => (k === "schlaf" ? "sleep" : k === "temperatur" ? "cycle" : k === "stress" ? "stress" : k === "schritte" || k === "bb" ? "training" : "recovery");

// Karten der Detailansicht: Satz, Zahl, Bereich, Grafik · Highlights · Vergleich nach Zyklusphase. Ohne Netzwerk.
export default function VerlaufDetail({ metric, span, rows, diary }: { metric: MetricKey; span: Span; rows: Daily[]; diary: Diary[] }) {
  const today = isoDay();
  const m = METRICS[metric];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const value = (d: string) => {
    const r = byDay.get(d);
    return r ? m.value(r) : null;
  };
  const base = metricBaseline(metric, rows, diary, today);
  const points = buildPoints(span, today, value);
  const weekly = spanOf(span).weekly;
  const days = spanDays(span, today);
  const sweat = new Set(diary.filter((e) => (e.symptoms?.nacht ?? 0) > 0).map((e) => e.day));
  const sweatNights = days.filter((d) => sweat.has(d)).length;
  // Hauttemperatur: Nächte nach der Sauna markieren (Garmin ordnet die Nacht dem Aufwachtag zu)
  const saunaDays = new Set(diary.filter((e) => e.influences?.includes("sauna")).map((e) => e.day));
  const dayBefore = (d: string) => {
    const x = new Date(d + "T12:00:00");
    x.setDate(x.getDate() - 1);
    return x.toISOString().slice(0, 10);
  };
  const saunaNight = (d: string) => saunaDays.has(dayBefore(d));
  const saunaNights = days.filter(saunaNight).length;
  // In der Lutealphase zählen Luteal-Tage gegen den Luteal-Bereich, alle anderen gegen den 30-Tage-Bereich
  const isLuteal = (d: string) => groupOf(cycleToday(d, diary).phase) === "luteal";
  const rangeFor = (d: string) => (base.luteal && isLuteal(d) ? base.luteal : base.range);
  const sum = summarize(span, points, base.active, rangeFor, m.fmt, m.label, metric === "schlaf" ? sweatNights : 0);
  const phases = weekly || span === "T" ? undefined : points.map((p) => groupOf(cycleToday(p.day, diary).phase));
  const hasPhase = !!phases?.some(Boolean);

  // Vergleich nach Zyklusphase: immer die letzten 6 Monate, unabhängig vom Zeitraum
  const recent = rows.filter((r) => r.day >= isoDay(daysAgo(HISTORY - 1)));
  const series = recent.map((r) => ({ day: r.day, value: m.value(r) }));
  const cycles = cycleLengths(diary).length;
  const pm = phaseMeans(series, diary);
  const phaseSentence = phaseInsight(m.label, series, diary, (v) => m.fmt(v).replace(/^\+/, ""));

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
          luteal={base.luteal}
        >
          {span === "T" ? (
            <>
              <RangeRow label={m.label} value={value(today)} fmt={m.fmt} range={base.range} luteal={base.luteal} tone={tone(metric)} />
              {stages && <SleepStagesBar minutes={stages} />}
            </>
          ) : (
            <LineBand
              values={points.map((p) => p.value)}
              fmt={m.fmt}
              tone={tone(metric)}
              label={`${m.label}, ${spanOf(span).name}${weekly ? " als Wochenmittel" : ""}, mit deinem Bereich`}
              band={base.range}
              lutealBand={weekly ? null : base.luteal}
              phases={hasPhase ? phases : undefined}
              zeroLine={metric === "temperatur"}
              markers={metric === "schlaf" && !weekly ? points.map((p) => sweat.has(p.day)) : metric === "temperatur" && !weekly && saunaNights > 0 ? points.map((p) => saunaNight(p.day)) : undefined}
              xLabels={axisLabels(points, span)}
            />
          )}
        </ValueHeader>
        <div className={`legend cb-${tone(metric)}`}>
          {base.range && <span><i className="legend-band" />Dein Bereich (30 Tage, mittlere Hälfte)</span>}
          {base.luteal && !weekly && <span><i className="legend-luteal" />Bereich Lutealphase</span>}
          {hasPhase && (
            <>
              <span><i className="ph-menses-bg" />Menstruation</span>
              <span><i className="ph-follikel-bg" />Follikel</span>
              <span><i className="ph-luteal-bg" />Luteal</span>
              <span>Phasen geschätzt</span>
            </>
          )}
          {metric === "schlaf" && !weekly && sweatNights > 0 && <span><i className="legend-sweat" />Nachtschweiß</span>}
          {metric === "temperatur" && !weekly && saunaNights > 0 && <span><i className="legend-sweat" />Nacht nach der Sauna</span>}
        </div>
        {metric === "temperatur" && !rows.some((r) => typeof r.skin_temp_delta === "number") && (
          <p>Noch keine Hauttemperatur. Sie kommt mit dem nächsten Garmin-Abruf, wenn deine Uhr sie nachts misst.</p>
        )}
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
            <PhaseCompare means={pm} range={base.range} fmt={m.fmt} label={m.label} tone={tone(metric)} />
            <span className="meta">
              {cycles} Zyklen. Mindestens 3 Tage je Phase, sonst steht ein Strich. Phasen sind geschätzt. Ein Zusammenhang, keine Diagnose.
            </span>
          </>
        ) : (
          <p>Der Vergleich erscheint, sobald zwei ganze Zyklen im Tagebuch stehen.</p>
        )}
      </section>

    </>
  );
}
