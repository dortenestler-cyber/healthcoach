import Link from "next/link";
import { LineBand, ValueHeader } from "@/components/charts";
import { metricBaseline, metricRangeSeries, positionIn, RANGE_PHASE_NAMES } from "@/lib/baseline";
import { groupOf, phaseBand, PHASES } from "@/lib/cycle";
import { daysAgo, isoDay } from "@/lib/dates";
import type { Data } from "@/lib/insights";

const PAST = 28;
const FUTURE = 7;
const ms = (v: number) => `${Math.round(v)} ms`;

// HRV der letzten 4 Wochen: dein Bereich als Band, das mitwandert (je Tag der Bereich, der damals galt, je Zyklusphase), Phasen getönt.
// Ansicht in der Karte „Deine Werte“ auf Heute (ohne eigenen Kartenrahmen).
export default function HrvCard({ data, showPhases }: { data: Data; showPhases: boolean }) {
  const today = isoDay();
  const days = Array.from({ length: PAST + (showPhases ? FUTURE : 0) }, (_, i) => isoDay(daysAgo(PAST - 1 - i)));
  const byDay = new Map(data.daily.map((r) => [r.day, r.hrv_last_night]));
  const values = days.map((d, i) => (i < PAST ? (byDay.get(d) ?? null) : null));
  const ctx = { diary: data.diary, sick: data.sick };
  const base = metricBaseline("hrv", data.daily, ctx, today);
  const pastBands = metricRangeSeries("hrv", data.daily, ctx, days.slice(0, PAST));
  const bands = [...pastBands, ...days.slice(PAST).map(() => null)];
  const phaseName = base.phase && base.phaseKey ? RANGE_PHASE_NAMES[base.phaseKey] : undefined;
  const value = byDay.get(today) ?? null;
  const phases = showPhases ? phaseBand(days, data.diary).map(groupOf) : undefined;
  const hasPhase = !!phases?.some((p) => p !== null);
  const phase = showPhases ? phaseBand([today], data.diary)[0] : null;

  let sentence = "Für heute gibt es noch keinen HRV-Wert.";
  if (value !== null && !base.active) sentence = "Dein Bereich entsteht ab 7 Tagen mit HRV-Werten.";
  else if (value !== null && base.active) {
    const pos = positionIn(value, base.active);
    const where = phaseName ? `deiner ${phaseName}` : "der letzten 30 Tage";
    sentence = pos === "im" ? `Deine HRV liegt im üblichen Bereich ${where}.` : `Deine HRV liegt ${pos} dem üblichen Bereich ${where}.`;
  }

  return (
    <div className="values-pane">
      <ValueHeader meta="HRV · letzte Nacht" sentence={sentence} value={value === null ? null : ms(value)} fmt={ms} range={base.range} phase={base.phase} phaseName={phaseName}>
        <LineBand
          values={values}
          fmt={ms}
          label="HRV der letzten 4 Wochen mit deinem Bereich"
          bands={bands}
          phases={hasPhase ? phases : undefined}
          dates={days}
          todayIndex={PAST - 1}
          futureFrom={showPhases ? PAST : undefined}
          xLabels={[{ index: 0, text: "vor 4 Wochen" }, { index: PAST - 1, text: "heute" }]}
        />
      </ValueHeader>
      {hasPhase ? (
        <div className="legend">
          <span><i className="legend-band" />Dein Bereich, wie er jeweils galt</span>
          <span>Phasen geschätzt{phase ? ` · heute ${PHASES[phase].label}` : ""}</span>
        </div>
      ) : (
        showPhases && <span className="meta">Trag deine Periode im Tagebuch ein, dann erscheinen die Phasen unter dem Chart.</span>
      )}
      <Link href="/verlauf?m=hrv" className="settings-link">HRV im Verlauf ›</Link>
    </div>
  );
}
