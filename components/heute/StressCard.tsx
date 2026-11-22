import Link from "next/link";
import { ValueRing } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import type { Data } from "@/lib/insights";
import { duration, stressDay, stressSentence } from "@/lib/stress";

const DE_DAY = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short" });

// Stress heute: Ring links, Kennzahlen rechts, darunter die Aufteilung (Konzept dunkel 2, Muster 4 und 7).
// Farbe Türkis, höher = kräftiger, nie ohne Zahl und Wort.
export default function StressCard({ day, data }: { day: string; data: Data }) {
  const s = stressDay(day, data.daily);
  const sentence = stressSentence(s);

  return (
    <section className="card">
      <div className="card-row">
        <span className="eyebrow">Stress · Garmin</span>
        <Link href="/verlauf?m=stress" className="settings-link">Verlauf ›</Link>
      </div>
      <div className="ring-stats">
        <ValueRing tone="stress" size={112} value={(s.value ?? 0) / 100} center={s.value === null ? "–" : String(s.value)} caption={s.word ?? "kein Wert"} label={s.value === null ? "Stress: noch kein Wert" : `Stress ${s.value} von 100, ${s.word}`} />
        <div className="stat-lines">
          <div className="stat-line">
            <span>Üblicher {s.weekday}</span>
            <strong>{s.usual === null ? "–" : Math.round(s.usual)}</strong>
          </div>
          <div className="stat-line">
            <span>Schnitt 30 Tage</span>
            <strong>{s.range ? Math.round(s.range.median) : "–"}</strong>
          </div>
          <div className="stat-line">
            <span>Höchster Tag der Woche</span>
            <strong>{s.weekMax ? `${s.weekMax.value} · ${DE_DAY(s.weekMax.day)}` : "–"}</strong>
          </div>
        </div>
      </div>
      {s.split && (
        <div className="split-bars" role="img" aria-label={`Aufteilung heute: ${s.split.map((p) => `${p.label} ${Math.round(p.share * 100)} Prozent, ${duration(p.seconds)}`).join(", ")}`}>
          {s.split.map((p, i) => (
            <div key={p.key} className="split-row">
              <div className="split-head">
                <span>{p.label}</span>
                <span>
                  <strong>{Math.round(p.share * 100)} %</strong> · {duration(p.seconds)}
                </span>
              </div>
              <div className="split-track">
                <span className={`split-fill stress-${i}`} style={{ width: `${Math.max(1, p.share * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <ExplainCard tone="stress" question={s.value === null ? undefined : `Mein Stress liegt heute bei ${s.value} (${s.word}). Was kann ich heute dagegen tun?`}>
        {sentence}
      </ExplainCard>
      {!s.split && s.value !== null && <span className="meta">Aufteilung und längste Phase erscheinen, sobald Garmin den Tagesverlauf liefert.</span>}
    </section>
  );
}
