import { HalfGauge } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import { clock } from "@/lib/dates";
import { loadPercent, type Data, type Target } from "@/lib/insights";
import { targetText } from "@/lib/today";

// Belastung heute als Halbbogen mit Zielbereich, zwei Kacheln und Erklärkarte (Konzept dunkel 2, Muster 2 und 3).
// Steht auf der Seite Tagesziel; auf Heute gibt es nur die Kurzzeile in „Heute steht an“.
export default function LoadCard({ day, data, target: t }: { day: string; data: Data; target: Target }) {
  const load = loadPercent(day, data.daily, data.acts);
  const today = data.daily.find((d) => d.day === day);
  const synced = data.daily.reduce((m, r) => Math.max(m, new Date(r.synced_at).getTime()), 0);
  const word = t.pause ? "Pause" : load < t.lo ? "Unter dem Ziel" : load <= t.hi ? "Im Ziel" : "Über dem Ziel";
  const activeMin = data.acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day).reduce((s, a) => s + (a.duration_s ?? 0) / 60, 0);

  return (
    <section className="card">
      <span className="eyebrow">Belastung heute</span>
      <div className="gauge-wrap">
        <HalfGauge
          tone="training"
          value={load / 100}
          target={t.pause ? null : { lo: t.lo / 100, hi: t.hi / 100 }}
          center={`${load} %`}
          caption={word}
          label={`Belastung ${load} Prozent, ${word}${t.pause ? "" : `, Ziel ${t.lo} bis ${t.hi} Prozent`}`}
        />
      </div>
      <p className="gauge-meta">
        {t.pause ? "Heute Pause" : `Ziel heute ${t.lo}–${t.hi} %`}
        {synced ? ` · Stand ${clock(new Date(synced))}` : ""}
      </p>
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="meta">Aktive Zeit</span>
          <span className="stat-tile-value">{Math.round(activeMin)} <small>min</small></span>
        </div>
        <div className="stat-tile">
          <span className="meta">Intensitätsminuten</span>
          <span className="stat-tile-value">{today?.intensity_minutes ?? "–"} <small>min</small></span>
        </div>
      </div>
      <ExplainCard tone="training" question={`Meine Belastung liegt heute bei ${load} %, Ziel ${t.pause ? "Pause" : `${t.lo}–${t.hi} %`}. Was passt heute noch?`}>
        {t.pause ? (
          targetText(t, load)
        ) : (
          <>
            Mit <strong>{load} %</strong> liegst du {load < t.lo ? "unter dem" : load <= t.hi ? "im" : "über dem"} Ziel von <strong>{t.lo} bis {t.hi} %</strong>. {load < t.lo ? "Eine Einheit wie geplant bringt dich hinein." : load <= t.hi ? "Für den Rest des Tages reicht leichte Bewegung, etwa Gehen." : "Plane morgen eher leicht."}
          </>
        )}
      </ExplainCard>
    </section>
  );
}
