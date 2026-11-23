import ExplainCard from "@/components/ui/ExplainCard";
import { PHASES, type DayRule } from "@/lib/cycle";
import { readinessWhy, type Row } from "@/lib/today";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Ein Satz zum Tag (Konzept Heute als Einstiegsseite, Abschnitt 3): Stufe, warum, Vorschlag und Belastungsziel in einer Erklärkarte.
// Bei Warnzeichen steht hier nur der Hinweis auf ärztliche Abklärung.
export default function DaySentence({ rule, factors, showLoad }: { rule: DayRule; factors: Row[]; showLoad: boolean }) {
  if (rule.level === "warnzeichen") {
    return (
      <div className="suggest suggest-warn day-sentence" role="alert">
        <span className="row-strong">{rule.title}</span>
        <span>{rule.text}</span>
      </div>
    );
  }

  const { value, label } = rule.readiness;
  const reason = readinessWhy(factors, label)?.replace(/ Darum heute „[^“]+“\.$/, "") ?? null;
  const t = rule.target;
  const phase = rule.cycle.phase ? PHASES[rule.cycle.phase] : null;

  return (
    <div className="day-sentence">
      <ExplainCard tone="recovery" question={`Was heißt meine Readiness von ${de1(value)} („${label}“) für heute?`}>
        Heute <strong>{label}</strong>. {reason ? reason + " " : ""}
        {rule.level === "phase" ? (
          phase ? (
            <>
              {phase.label} (geschätzt): {phase.suggestion}.
            </>
          ) : null
        ) : (
          <>
            <strong>{rule.title}.</strong> {rule.text}
          </>
        )}
        {showLoad && !t.pause && (
          <>
            {" "}
            Dein Belastungsziel: <strong>{t.lo}–{t.hi} %</strong>.
          </>
        )}
      </ExplainCard>
    </div>
  );
}
