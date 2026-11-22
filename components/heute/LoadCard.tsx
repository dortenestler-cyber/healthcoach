import Link from "next/link";
import { HalfGauge } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import { clock } from "@/lib/dates";
import { dayLoad, firstAlltagDay, type Data, type Target } from "@/lib/insights";
import { targetText } from "@/lib/today";

// Belastung heute als Halbbogen mit Zielbereich, Kacheln und Erklärkarte (Konzept dunkel 2, Muster 2 und 3).
// Training kräftig, Alltag hell (Konzept Korridore und Alltagslast, Teil B).
// Steht auf der Seite Tagesziel; auf Heute gibt es nur die Kurzzeile in „Heute steht an“.
export default function LoadCard({ day, data, target: t }: { day: string; data: Data; target: Target }) {
  const dl = dayLoad(day, data.daily, data.acts);
  const load = dl.pct;
  const first = firstAlltagDay(data.daily);
  const recentStart = first !== null && first >= new Date(new Date(day + "T12:00:00").getTime() - 14 * 864e5).toISOString().slice(0, 10);
  const share = load > 0 ? dl.pctAlltag / load : 0;
  const shareWord = share >= 0.9 ? "fast ganz" : share >= 0.6 ? "zum größten Teil" : share >= 0.4 ? "etwa zur Hälfte" : share >= 0.25 ? "zu etwa einem Drittel" : share > 0 ? "zu einem kleinen Teil" : null;
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
          split={dl.quelle ? dl.pctTraining / 100 : null}
          target={t.pause ? null : { lo: t.lo / 100, hi: t.hi / 100 }}
          center={`${load} %`}
          caption={word}
          label={`Belastung ${load} Prozent${dl.pctAlltag ? `, davon Alltag ${dl.pctAlltag} Prozent` : ""}, ${word}${t.pause ? "" : `, Ziel ${t.lo} bis ${t.hi} Prozent`}`}
        />
      </div>
      <p className="gauge-meta">
        {t.pause ? "Heute Pause" : `Ziel heute ${t.lo}–${t.hi} %`}
        {synced ? ` · Stand ${clock(new Date(synced))}` : ""}
      </p>
      {dl.quelle && (
        <>
          <p className="load-split">
            {shareWord ? `Heute kam deine Belastung ${shareWord} aus dem Alltag.` : "Heute kam deine Belastung nur aus dem Training."}
            {dl.quelle === "schritte" ? " Alltag geschätzt aus Schritten, weil die Uhr kaum Puls hat." : ""}
          </p>
          <div className="legend cb-training">
            <span><i className="legend-training" />Training {dl.pctTraining} %</span>
            <span><i className="legend-alltag" />Alltag {dl.pctAlltag} %</span>
          </div>
        </>
      )}
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="meta">Training</span>
          <span className="stat-tile-value">{Math.round(activeMin)} <small>min</small></span>
        </div>
        {dl.quelle ? (
          <div className="stat-tile">
            <span className="meta">Alltag in Bewegung</span>
            <span className="stat-tile-value">{dl.alltagMin ?? "–"} <small>min</small></span>
            {dl.steps !== null && <span className="meta">{dl.steps.toLocaleString("de-DE")} Schritte außerhalb von Training</span>}
          </div>
        ) : (
          <div className="stat-tile">
            <span className="meta">Intensitätsminuten</span>
            <span className="stat-tile-value">{today?.intensity_minutes ?? "–"} <small>min</small></span>
          </div>
        )}
      </div>
      <Link href="/verlauf?m=belastung" className="settings-link">Belastung im Verlauf ›</Link>
      {recentStart && <span className="meta">Seit {Number(first!.slice(8, 10))}.{Number(first!.slice(5, 7))}. zählt auch Bewegung im Alltag. Deine Werte sind deshalb etwas höher als vorher.</span>}
      <ExplainCard tone="training" question={`Meine Belastung liegt heute bei ${load} %${dl.pctAlltag ? ` (davon Alltag ${dl.pctAlltag} %)` : ""}, Ziel ${t.pause ? "Pause" : `${t.lo}–${t.hi} %`}. Was passt heute noch?`}>
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
