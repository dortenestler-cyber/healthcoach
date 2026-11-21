import { PHASES, STAGES, type DayRule, type Stage } from "@/lib/cycle";

const STAGE_ORDER: Stage[] = ["erholen", "behutsam", "bereit", "volle-kraft"];

const num = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });

// Readiness 0–10 mit Ring, Vier-Stufen-Leiste und Vorschlag nach der Regelreihenfolge
export default function ReadinessCard({ rule }: { rule: DayRule }) {
  // Warnzeichen: nur der ärztliche Hinweis, sonst nichts
  if (rule.level === "warnzeichen") {
    return (
      <section className="card">
        <span className="meta">Readiness</span>
        <div className="suggest suggest-warn" role="alert">
          <span className="row-strong">{rule.title}</span>
          <span>{rule.text}</span>
        </div>
      </section>
    );
  }

  const { value, stage, label } = rule.readiness;
  const r = 42;
  const c = 2 * Math.PI * r;
  const tone = rule.level === "phase" ? (rule.cycle.phase ? "suggest-cycle" : "") : rule.level === "reha" ? "suggest-training" : "suggest-warn";
  const phase = rule.cycle.phase ? PHASES[rule.cycle.phase].label : null;

  return (
    <section className="card">
      <div className="readiness">
        <svg width="112" height="112" viewBox="0 0 100 100" role="img" aria-label={`Readiness ${num(value)} von 10, Stufe ${label}`}>
          <g transform="rotate(-90 50 50)" fill="none" strokeWidth="9">
            <circle cx="50" cy="50" r={r} stroke="var(--recovery-bg)" />
            <circle cx="50" cy="50" r={r} stroke="var(--recovery)" strokeLinecap="round" strokeDasharray={`${(Math.max(0.2, value) / 10) * c} ${c}`} />
          </g>
          <text x="50" y="54" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)">{num(value)}</text>
          <text x="50" y="68" textAnchor="middle" fontSize="8" fill="var(--muted)">von 10</text>
        </svg>
        <div className="stack">
          <span className="meta">Readiness heute</span>
          <span className="target-label">{label}</span>
          {!rule.target.enoughData && <span className="meta">Wird genauer, sobald 7 Tage Garmin-Daten da sind.</span>}
        </div>
      </div>

      <div className="stage-bar" aria-hidden="true">
        {STAGE_ORDER.map((s) => (
          <div key={s} className="stage" data-on={s === stage}>
            <span />
            <small>{STAGES[s]}</small>
          </div>
        ))}
      </div>

      <div className={"suggest " + tone}>
        <span className="row-strong">{rule.title}</span>
        <span>{rule.text}</span>
      </div>

      <span className="meta">
        {rule.cycle.cycleDay !== null ? `Zyklustag ${rule.cycle.cycleDay}${phase ? " · " + phase + " (geschätzt)" : ""}` : "Zyklus: noch keine Periode im Tagebuch"}
        {rule.cycle.window ? ` · Nächste Periode etwa ${date(rule.cycle.window.earliest)} bis ${date(rule.cycle.window.latest)}` : rule.cycle.cycleDay !== null ? " · Periodenfenster ab 2 Zyklen" : ""}
      </span>
      <span className="meta">Vorschlag, keine Diagnose. Du entscheidest.</span>
    </section>
  );
}
