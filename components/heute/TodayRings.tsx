import Link from "next/link";
import { ValueRing } from "@/components/charts";
import type { DayRule } from "@/lib/cycle";
import { loadPercent, type Data } from "@/lib/insights";
import { hm, sleepAchieved, sleepNeed } from "@/lib/today";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Drei Ringe oben auf Heute: Schlaf (in % vom Bedarf), Readiness (0–10), Belastung mit Zielbogen.
// Darunter Belastungsziel und Schlafbedarf für heute Nacht mit Herleitung.
export default function TodayRings({ day, data, rule, showLoad }: { day: string; data: Data; rule: DayRule; showLoad: boolean }) {
  const slept = sleepAchieved(day, data);
  const need = sleepNeed(day, data.daily, data.acts);
  const t = rule.target;
  const load = loadPercent(day, data.daily, data.acts);
  const r = rule.readiness;
  const sleepPct = slept.ratio === null ? null : Math.round(slept.ratio * 100);

  return (
    <section className="card">
      <span className="eyebrow">Heute im Überblick</span>
      <div className="ring-row">
        <Link href="/verlauf?m=schlaf" className="ring-cell">
          <ValueRing tone="sleep" value={slept.ratio ?? 0} center={sleepPct === null ? "–" : `${sleepPct} %`} caption="Schlaf" label={sleepPct === null ? "Schlaf: noch kein Wert für letzte Nacht" : `Schlaf ${sleepPct} Prozent vom Bedarf`} />
        </Link>
        <div className="ring-cell">
          <ValueRing tone="recovery" value={r.value / 10} center={rule.level === "warnzeichen" ? "–" : de1(r.value)} caption={r.label} label={`Readiness ${de1(r.value)} von 10, ${r.label}`} />
        </div>
        {showLoad && (
          <Link href="/training?t=auswertung" className="ring-cell">
            <ValueRing tone="training" value={load / 100} target={t.pause ? null : { lo: t.lo / 100, hi: t.hi / 100 }} center={`${load} %`} caption="Belastung" label={`Belastung ${load} Prozent, Ziel ${t.lo} bis ${t.hi} Prozent`} />
          </Link>
        )}
      </div>

      <div className="today-line">
        <span className="row-strong">Schlafbedarf heute Nacht etwa {hm(need.hours)}</span>
        <span>
          {slept.hours === null ? "Für letzte Nacht gibt es noch keinen Schlafwert." : `Letzte Nacht ${hm(slept.hours)}, das sind ${sleepPct} % vom Bedarf.`}
        </span>
        <span className={need.debtH >= 0.25 ? "debt-line" : undefined}>
          {!need.baseFromData ? "Schlafschuld zählt ab 14 Nächten mit Schlafwerten." : need.debtH < 0.25 ? "Diese Woche keine Schlafschuld." : `Diese Woche etwa ${hm(need.debtH)} unter deinem Grundbedarf.`}
        </span>
        <details className="derive">
          <summary>Was deinen Schlafbedarf beeinflusst</summary>
          <ul>
            <li>
              Grundbedarf {hm(need.baseH)} {need.baseFromData ? "(dein üblicher Schlaf der letzten 30 Nächte)" : "(Startwert, eigener Wert ab 14 Nächten)"}
            </li>
            <li>
              Schlafschuld der letzten 7 Nächte {hm(need.debtH)}, davon {need.debtAddMin} min dazu
            </li>
            <li>{need.loadAddMin ? `${need.loadAddMin} min dazu nach deiner Belastung heute` : "Kein Zuschlag für Belastung heute"}</li>
          </ul>
        </details>
      </div>
      <span className="meta">Richtwerte aus deinen Daten, keine Diagnose.</span>
    </section>
  );
}
