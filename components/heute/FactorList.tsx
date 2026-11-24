import Link from "next/link";
import { positionIn } from "@/lib/baseline";
import { bereichWort } from "@/lib/einordnung";
import type { Row } from "@/lib/today";

// Kennzahlen-Liste im Stil von Whoop (Detailseiten hinter den Ringen auf Heute).
// Großbuchstaben-Name, darunter ein Wort zur Einordnung, rechts die Zahl.
// mode "pfeil": ▲ über, ▼ unter deinem Bereich, • typisch (Erholung, Readiness).
// mode "stufen": drei Felder unter · im · über deinem Bereich, nur das passende in Familienfarbe (Schlaf). Keine Ampel.
export default function FactorList({ rows, mode = "pfeil", tone = "recovery", legend }: { rows: Row[]; mode?: "pfeil" | "stufen"; tone?: "recovery" | "sleep" | "neutral"; legend: string }) {
  return (
    <div className={`factor-table tone-${tone}`}>
      {rows.map((r) => {
        const pos = r.value !== null && r.base.active ? positionIn(r.value, r.base.active) : null;
        const word = r.value === null ? "kein Wert" : pos === null ? "Bereich ab 14 Tagen" : bereichWort(pos);
        const body = (
          <>
            <span className="factor-name">{r.label}</span>
            <span className="factor-word">{word}</span>
            {mode === "stufen" && (
              <span className="factor-steps" aria-hidden="true">
                {(["unter", "im", "über"] as const).map((s) => (
                  <i key={s} data-on={pos === s} />
                ))}
              </span>
            )}
            <span className="factor-value">
              {r.value === null ? "–" : r.fmt(r.value)}
              {mode === "pfeil" && (
                <span className="factor-arrow" aria-hidden="true">
                  {pos === "über" ? "▲" : pos === "unter" ? "▼" : pos === "im" ? "•" : ""}
                </span>
              )}
            </span>
          </>
        );
        const aria = `${r.label}: ${r.value === null ? "kein Wert" : r.fmt(r.value)}, ${word}`;
        return r.href ? (
          <Link key={r.key} href={r.href} className="factor-line" aria-label={`${aria}. Verlauf öffnen`}>
            {body}
          </Link>
        ) : (
          <div key={r.key} className="factor-line" aria-label={aria}>
            {body}
          </div>
        );
      })}
      <div className="factor-legend">
        {mode === "pfeil" ? (
          <span>▲ ▼ {legend}</span>
        ) : (
          <span className="factor-legend-steps">
            <span className="factor-steps" aria-hidden="true">
              <i data-on="true" />
              <i />
              <i />
            </span>
            {legend}
          </span>
        )}
      </div>
    </div>
  );
}
