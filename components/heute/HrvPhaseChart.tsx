import Link from "next/link";
import { isoDay, daysAgo } from "@/lib/dates";
import { hrvInsight, phaseBand, type Phase } from "@/lib/cycle";
import type { Data } from "@/lib/insights";

const PAST = 28;
const FUTURE = 7;

// Drei Bänder wie im Konzept: Menstruation, Follikel (mit Eisprung-Fenster), Luteal
const bandClass = (p: Phase | null) =>
  p === "menstruation" ? "ph-menses" : p === "follikel" || p === "eisprung" ? "ph-follikel" : p === "luteal-frueh" || p === "luteal-spaet" ? "ph-luteal" : "";

// HRV der letzten 28 Tage mit Phasenband, Linie für heute, die nächsten 7 Tage aufgehellt
export default function HrvPhaseChart({ data }: { data: Data }) {
  const today = isoDay();
  const days = Array.from({ length: PAST + FUTURE }, (_, i) => isoDay(daysAgo(PAST - 1 - i)));
  const bands = phaseBand(days, data.diary);
  const byDay = new Map(data.daily.map((r) => [r.day, r.hrv_last_night]));
  const vals = days.slice(0, PAST).map((d) => byDay.get(d) ?? null);
  const present = vals.filter((v): v is number => v !== null);
  const n = days.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const lo = present.length ? Math.min(...present) : 0;
  const hi = present.length ? Math.max(...present) : 1;
  const pad = (hi - lo) * 0.15 || 5;
  const y = (v: number) => 92 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * 84;
  const points = vals.map((v, i) => (v === null ? null : `${x(i).toFixed(2)},${y(v).toFixed(2)}`)).filter(Boolean).join(" ");
  const todayX = x(PAST - 1);
  const hasPhase = bands.some((b) => b !== null);

  return (
    <Link href="/verlauf?m=hrv" className="card chart-card">
      <span className="meta">HRV · 4 Wochen ›</span>
      <h2>{hrvInsight(today, data)}</h2>
      <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="HRV der letzten 4 Wochen mit Zyklusphasen">
        {bands.map((b, i) => (b ? <rect key={i} x={(i / n) * 100} y={0} width={100 / n + 0.05} height={100} className={bandClass(b)} /> : null))}
        {points && <polyline points={points} className="chart-line" />}
        <rect x={(PAST / n) * 100} y={0} width={(FUTURE / n) * 100} height={100} className="chart-future" />
        <line x1={todayX} x2={todayX} y1={0} y2={100} className="chart-today" />
      </svg>
      <div className="card-row meta">
        <span>vor 4 Wochen</span>
        <span>heute</span>
        <span>+7 Tage</span>
      </div>
      {hasPhase ? (
        <div className="legend">
          <span><i className="ph-menses-bg" />Menstruation</span>
          <span><i className="ph-follikel-bg" />Follikel</span>
          <span><i className="ph-luteal-bg" />Luteal</span>
          <span>Phasen geschätzt</span>
        </div>
      ) : (
        <span className="meta">Trag deine Periode im Tagebuch ein, dann erscheinen die Phasen im Hintergrund.</span>
      )}
      {!present.length && <span className="meta">Noch keine HRV-Werte. Synchronisiere deine Garmin-Daten.</span>}
    </Link>
  );
}
