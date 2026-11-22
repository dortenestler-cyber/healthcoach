import Link from "next/link";
import { RangeRow, ValueRing } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import { countInRange, positionIn } from "@/lib/baseline";
import { PHASES, STAGES, windowText, type DayRule, type Stage } from "@/lib/cycle";
import { isoDay } from "@/lib/dates";
import type { Row } from "@/lib/today";

const STAGE_ORDER: Stage[] = ["erholen", "behutsam", "bereit", "volle-kraft"];

const num = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });

const joinDe = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);

// Ein Satz, warum die Readiness so ist: welche Faktoren über, unter oder in deinem Bereich liegen
function why(factors: Row[], label: string): string | null {
  const over: string[] = [];
  const under: string[] = [];
  const typical: string[] = [];
  for (const f of factors) {
    if (f.value === null || !f.base.active) continue;
    const p = positionIn(f.value, f.base.active);
    (p === "über" ? over : p === "unter" ? under : typical).push(f.label);
  }
  if (!over.length && !under.length && !typical.length) return null;
  const s: string[] = [];
  if (over.length) s.push(`${joinDe(over)} ${over.length > 1 ? "liegen" : "liegt"} über deinem Bereich`);
  if (under.length) s.push(`${joinDe(under)} ${under.length > 1 ? "liegen" : "liegt"} unter deinem Bereich`);
  if (typical.length) s.push(`${joinDe(typical)} ${typical.length > 1 ? "sind" : "ist"} typisch`);
  return `${s.join(", ")}. Darum heute „${label}“.`;
}

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
  const reason = why(factors, label);
  const sentence = count.total ? `${count.inRange} von ${count.total} Faktoren in deinem Bereich.` : "Deine Bereiche entstehen ab 14 Tagen Daten.";

  return (
    <section className="card">
      <span className="eyebrow">Readiness heute</span>
      <h2>{sentence}</h2>
      <div className="ring-hero">
        <ValueRing tone="recovery" size={208} value={value / 10} center={num(value)} caption={label} label={`Readiness ${num(value)} von 10, ${label}`} />
      </div>
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

      <details className="derive">
        <summary>Faktoren und Erklärung</summary>
        <div className="factor-list factor-box">
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
          <span className="meta factor-foot">Punkt = heute, Band = deine letzten 30 Tage{rule.cycle.phase && rule.cycle.phase.startsWith("luteal") ? " (in der Lutealphase: deine früheren Lutealphasen)" : ""}</span>
        </div>

        {reason && (
          <ExplainCard tone="recovery" question={`Warum ist meine Readiness heute ${num(value)} von 10 („${label}“)?`}>
            {reason}
          </ExplainCard>
        )}
      </details>

      <span className="meta">
        {rule.cycle.cycleDay !== null ? `Zyklustag ${rule.cycle.cycleDay}${phase ? " · " + phase + " (geschätzt)" : ""}` : "Zyklus: noch keine Periode im Tagebuch"}
        {rule.cycle.window ? ` · ${windowText(rule.cycle.window, isoDay())} (${rule.cycle.window.earliest === rule.cycle.window.latest ? date(rule.cycle.window.earliest) : `${date(rule.cycle.window.earliest)}–${date(rule.cycle.window.latest)}`})` : rule.cycle.cycleDay !== null ? " · Periodenfenster ab 2 Zyklen" : ""}
      </span>
      <span className="meta">Vorschlag, keine Diagnose. Du entscheidest.</span>
    </section>
  );
}
