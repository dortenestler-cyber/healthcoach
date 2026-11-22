import Link from "next/link";
import { RangeRow } from "@/components/charts";
import { countInRange } from "@/lib/baseline";
import { PHASES, STAGES, type DayRule, type Stage } from "@/lib/cycle";
import type { Row } from "@/lib/today";

const STAGE_ORDER: Stage[] = ["erholen", "behutsam", "bereit", "volle-kraft"];

const num = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });

// Readiness 0–10 mit Stufenleiste, Vorschlag nach der Regelreihenfolge und vier Beitragsfaktoren (HRV, Ruhepuls, Schlaf, Last)
export default function ReadinessCard({ rule, factors }: { rule: DayRule; factors: Row[] }) {
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
  const tone = rule.level === "phase" ? (rule.cycle.phase ? "suggest-cycle" : "") : rule.level === "reha" ? "suggest-training" : "suggest-warn";
  const phase = rule.cycle.phase ? PHASES[rule.cycle.phase].label : null;
  const count = countInRange(factors.map((f) => ({ value: f.value, range: f.base.active })));
  const sentence = count.total ? `${count.inRange} von ${count.total} Faktoren in deinem Bereich.` : "Deine Bereiche entstehen ab 14 Tagen Daten.";

  return (
    <section className="card">
      <span className="meta">Readiness heute</span>
      <h2>{sentence}</h2>
      <p className="value-big">
        {num(value)} <span className="value-unit">von 10 · {label}</span>
      </p>
      {!rule.target.enoughData && <span className="meta">Wird genauer, sobald 7 Tage Garmin-Daten da sind.</span>}

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

      <div className="factor-list">
        {factors.map((f) => {
          const row = <RangeRow label={f.label} value={f.value} fmt={f.fmt} range={f.base.range} luteal={f.base.luteal} tone="recovery" />;
          return f.href ? (
            <Link key={f.key} href={f.href} className="row-link">
              {row}
            </Link>
          ) : (
            <div key={f.key}>{row}</div>
          );
        })}
      </div>

      <span className="meta">
        {rule.cycle.cycleDay !== null ? `Zyklustag ${rule.cycle.cycleDay}${phase ? " · " + phase + " (geschätzt)" : ""}` : "Zyklus: noch keine Periode im Tagebuch"}
        {rule.cycle.window ? ` · Nächste Periode etwa ${date(rule.cycle.window.earliest)} bis ${date(rule.cycle.window.latest)}` : rule.cycle.cycleDay !== null ? " · Periodenfenster ab 2 Zyklen" : ""}
      </span>
      <span className="meta">Vorschlag, keine Diagnose. Du entscheidest.</span>
    </section>
  );
}
