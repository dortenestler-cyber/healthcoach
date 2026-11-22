import { ZoneScale } from "@/components/charts";
import type { Data } from "@/lib/insights";
import { loadRatio, ratioText, RATIO_HI, RATIO_LO, weekIntensity, WHO_MINUTES } from "@/lib/trainingLoad";

const de2 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Belastungsverhältnis (7 Tage ÷ Wochenschnitt 28 Tage) und Intensitätsminuten der Woche gegen 150 (WHO). Ohne Netzwerk.
export default function RatioCard({ today, data }: { today: string; data: Data }) {
  const r = loadRatio(today, data);
  const im = weekIntensity(today, data);
  const pct = Math.min(100, Math.round((im / WHO_MINUTES) * 100));

  return (
    <section className="card">
      <span className="meta">Belastungsverhältnis · 7 Tage zu 4 Wochen</span>
      {r.ratio === null ? (
        <>
          <h2>Das Verhältnis entsteht nach 4 Wochen mit Garmin-Aktivitäten.</h2>
          <p className="value-big">–</p>
        </>
      ) : (
        <>
          <h2>{ratioText(r.ratio)}</h2>
          <p className="value-big">{de2(r.ratio)}</p>
          <p className="value-range">Bereich {de1(RATIO_LO)}–{de1(RATIO_HI)} · Last 7 Tage {Math.round(r.acute)}, Wochenschnitt {Math.round(r.chronic ?? 0)}</p>
          <ZoneScale
            value={r.ratio}
            min={0.4}
            max={1.8}
            fmt={de1}
            label={`Belastungsverhältnis ${de2(r.ratio)}, Bereich ${de1(RATIO_LO)} bis ${de1(RATIO_HI)}`}
            zones={[{ to: RATIO_LO, label: "Abbau" }, { to: RATIO_HI, label: "Aufbau", target: true }, { to: 1.8, label: "schneller Anstieg" }]}
          />
        </>
      )}

      <div className="today-line">
        <span className="row-strong">
          Intensitätsminuten diese Woche: {im} von {WHO_MINUTES}
        </span>
        <div className="progress" role="img" aria-label={`${im} von ${WHO_MINUTES} Intensitätsminuten, ${pct} Prozent`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <span>{im >= WHO_MINUTES ? "Wochenziel erreicht." : `Noch ${WHO_MINUTES - im} Minuten bis 150.`} Garmin zählt intensive Minuten doppelt.</span>
        <span className="meta">Quelle: WHO-Empfehlung, mindestens 150 Minuten mäßige Bewegung pro Woche.</span>
      </div>
    </section>
  );
}
