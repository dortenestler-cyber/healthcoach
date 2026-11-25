import Link from "next/link";
import { DayBars, Heatmap, LineBand, ValueHeader } from "@/components/charts";
import type { Diary } from "@/lib/insights";
import { avgBefore, cycleLengthView, flashesPerWeek, symptomHeat } from "@/lib/zyklusAuswertung";

const days = (v: number) => `${Math.round(v)} T.`;
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const de1 = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });

// Seite Zyklus, unterer Teil: Zykluslängen mit Bereich von vor einem Jahr, Hitzewallungen pro Woche, Symptome nach Zyklustag.
// Ohne Netzwerk. Zusammenhänge, keine Diagnose.
// teil: nur die Perioden (Zykluslänge) oder nur die Symptome (Hitzewallungen, Raster); Konzept Einfach, Paket 5
export default function CycleHistory({ today, diary, flashes, showFlashes, muscle, teil = "alle" }: { today: string; diary: Diary[]; flashes: string[]; showFlashes: boolean; muscle?: Map<string, number>; teil?: "alle" | "perioden" | "symptome" }) {
  const cl = cycleLengthView(diary, today);
  const last = cl.recent[cl.recent.length - 1];
  const y = cl.yearAgo;
  let sentence = "Die Zykluslängen erscheinen ab zwei eingetragenen Perioden.";
  if (last && !y) sentence = `Dein letzter Zyklus dauerte ${last.length} Tage. Der Vergleich mit dem Vorjahr kommt ab 3 Zyklen von damals.`;
  else if (last && y) {
    const inside = cl.recent.slice(-3).filter((c) => c.length >= y.lo && c.length <= y.hi).length;
    sentence = inside === 3 ? "Deine letzten Zyklen liegen im Bereich von vor einem Jahr." : `${3 - inside} der letzten 3 Zyklen ${3 - inside === 1 ? "liegt" : "liegen"} außerhalb des Bereichs von vor einem Jahr.`;
  }

  const weeks = flashesPerWeek(flashes, today);
  const avg = avgBefore(weeks);
  const now = weeks[weeks.length - 1]?.count ?? 0;
  const flashSentence = !flashes.length
    ? "Noch keine Hitzewallungen eingetragen. Das geht auf Heute mit einem Tipp."
    : avg === null
      ? `${now} Hitzewallungen diese Woche.`
      : Math.abs(now - avg) < 1
        ? `Diese Woche etwa so viele Hitzewallungen wie im Schnitt (${de1(avg)}).`
        : `Diese Woche ${now > avg ? "mehr" : "weniger"} Hitzewallungen als im Schnitt der Wochen davor (${de1(avg)}).`;

  const heat = symptomHeat(diary, muscle);
  const peak = heat.rows[0];
  let heatSentence = "Das Raster erscheint ab zwei ganzen Zyklen mit Symptomen im Tagebuch.";
  if (peak) {
    const max = Math.max(...peak.values.map((v) => v ?? 0));
    const at = peak.values.findIndex((v) => v === max);
    heatSentence = `Am häufigsten trägst du „${peak.label}“ ein, besonders um Zyklustag ${at + 1}.`;
  }

  return (
    <>
      {teil !== "symptome" && (
      <section className="card">
        <ValueHeader meta="Zykluslänge · letzte 12 Zyklen" sentence={sentence} value={last ? `${last.length} Tage` : null}>
          <p className="value-range">{y ? `Bereich vor einem Jahr ${y.lo === y.hi ? y.lo : `${de1(y.lo)}–${de1(y.hi)}`} Tage` : "Bereich vor einem Jahr ab 3 Zyklen von damals"}</p>
          {cl.recent.length >= 2 && (
            <LineBand
              values={cl.recent.map((c) => c.length)}
              fmt={days}
              tone="cycle"
              label={`Zykluslängen: ${cl.recent.map((c) => `${short(c.start)} ${c.length} Tage`).join(", ")}`}
              band={y}
              tipNote={(i) => `Beginn ${short(cl.recent[i].start)}`}
              xLabels={[{ index: 0, text: short(cl.recent[0].start) }, { index: cl.recent.length - 1, text: short(last.start) }]}
              height={150}
            />
          )}
        </ValueHeader>
        {y && <span className="meta">Band: mittlere Hälfte der Zykluslängen von vor einem Jahr ({cl.yearAgoN} Zyklen). Kürzere oder unregelmäßige Zyklen sind in der Perimenopause häufig. Sehr starke oder lange Blutungen bitte ärztlich abklären lassen.</span>}
        <Link href="#perioden" className="settings-link">Vergangene Perioden nachtragen ›</Link>
      </section>
      )}

      {teil !== "perioden" && showFlashes && (
        <section className="card">
          <ValueHeader meta="Hitzewallungen · pro Woche" sentence={flashSentence} value={String(now)}>
            <span className="value-range">diese Woche{avg !== null ? ` · Schnitt davor ${de1(avg)}` : ""}</span>
            <DayBars
              tone="warn"
              fmt={(v) => String(Math.round(v))}
              label={`Hitzewallungen der letzten 12 Wochen: ${weeks.map((w) => `ab ${short(w.monday)} ${w.count}`).join(", ")}`}
              target={avg}
              targetLabel={avg !== null ? `Schnitt ${de1(avg)}` : undefined}
              bars={weeks.map((w, i) => ({ label: i % 3 === 0 || i === weeks.length - 1 ? short(w.monday) : "", value: w.count, tip: `Woche ab ${short(w.monday)}`, today: i === weeks.length - 1 }))}
            />
          </ValueHeader>
        </section>
      )}

      {teil !== "perioden" && (
      <section className="card">
        <span className="meta">Symptome nach Zyklustag · letzte {heat.n || 4} Zyklen</span>
        <h2>{heatSentence}</h2>
        {heat.rows.length > 0 && <Heatmap rows={heat.rows} columns={heat.columns} label={`Symptome nach Zyklustag über ${heat.n} Zyklen`} />}
        <span className="meta">Anteil der Zyklen, in denen du das Symptom an diesem Tag eingetragen hast. Ein Zusammenhang, keine Diagnose.</span>
      </section>
      )}
    </>
  );
}
