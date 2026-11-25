import { ValueRing, ZoneScale } from "@/components/charts";
import { Details } from "@/components/ui/Pille";
import type { ReactNode } from "react";
import type { Data } from "@/lib/insights";
import { loadRatio, ratioText, RATIO_HI, RATIO_LO, weekIntensity, WHO_MINUTES } from "@/lib/trainingLoad";

const de2 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SCALE_MAX = 1.8;

export function statusWord(r: number): string {
  if (r < RATIO_LO) return "Abbau";
  if (r > RATIO_HI) return "Schneller Anstieg";
  return "Aufbau";
}

// Status (Konzept dunkel 2, Muster 13): Statuswort, Ring mit der Last der letzten 7 Tage, „Was das heißt“.
// Unter „Details“ (Konzept Einfach, Paket 4): Belastungsverhältnis (7 Tage ÷ Wochenschnitt 28 Tage),
// Intensitätsminuten gegen 150 (WHO) und `zusatz` (z. B. Umschalter Mit Alltag · Nur Training). Ohne Netzwerk.
export default function RatioCard({ today, data, alltag = true, zusatz }: { today: string; data: Data; alltag?: boolean; zusatz?: ReactNode }) {
  const r = loadRatio(today, data, alltag);
  const im = weekIntensity(today, data);
  const pct = Math.min(100, Math.round((im / WHO_MINUTES) * 100));
  const chronic = r.chronic ?? 0;

  return (
    <section className="card">
      <div className="status-box">
        <div className="stack">
          <span className="eyebrow">Trainings-Status</span>
          <span className="status-word">{r.ratio === null ? "Entsteht noch" : statusWord(r.ratio)}</span>
        </div>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      </div>

      {r.ratio === null ? (
        <p>Der Status entsteht nach 4 Wochen mit Garmin-Aktivitäten.</p>
      ) : (
        <>
          <div className="ring-stats">
            <ValueRing
              tone="training"
              size={116}
              value={chronic ? r.acute / (chronic * SCALE_MAX) : 0}
              target={{ lo: RATIO_LO / SCALE_MAX, hi: RATIO_HI / SCALE_MAX }}
              center={String(Math.round(r.acute))}
              caption="Belastung 7 Tage"
              label={`Belastung der letzten 7 Tage ${Math.round(r.acute)}, Korridor ${Math.round(chronic * RATIO_LO)} bis ${Math.round(chronic * RATIO_HI)}`}
            />
            <div className="stack status-means">
              <span className="eyebrow">Was das heißt</span>
              <span className="status-text">{ratioText(r.ratio)}</span>
              <span className="chip chip-training">
                <strong>{Math.round(chronic * RATIO_LO)}–{Math.round(chronic * RATIO_HI)}</strong> · dein Korridor
              </span>
            </div>
          </div>
        </>
      )}

      <Details id="training.status">
        {zusatz}
        {r.ratio !== null && (
          <div className="today-line">
            <span className="row-strong">Belastungsverhältnis {de2(r.ratio)}</span>
            <ZoneScale
              value={r.ratio}
              min={0.4}
              max={SCALE_MAX}
              fmt={de1}
              label={`Belastungsverhältnis ${de2(r.ratio)}, Bereich ${de1(RATIO_LO)} bis ${de1(RATIO_HI)}`}
              zones={[{ to: RATIO_LO, label: "Abbau" }, { to: RATIO_HI, label: "Aufbau", target: true }, { to: SCALE_MAX, label: "schneller Anstieg" }]}
            />
            <span className="meta">Belastung 7 Tage {Math.round(r.acute)} ÷ Wochenschnitt der letzten 4 Wochen {Math.round(chronic)}{alltag ? ", mit Alltag" : ", nur Training"}</span>
          </div>
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
      </Details>
    </section>
  );
}
