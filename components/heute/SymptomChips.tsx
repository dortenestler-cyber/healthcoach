import { LEVELS } from "@/lib/catalog";

// Schnell-Eintrag: ein Tipp speichert das Symptom heute als „mittel“ im Tagebuch
export const QUICK_SYMPTOMS: { key: string; label: string }[] = [
  { key: "nacht", label: "Nachtschweiß" },
  { key: "schlaf", label: "Schlafprobleme" },
  { key: "gelenk", label: "Gelenke" },
  { key: "erschoepf", label: "Erschöpfung" },
  { key: "hitze", label: "Hitzewallungen" },
];

export default function SymptomChips({ symptoms, busy, onToggle }: { symptoms: Record<string, number>; busy: boolean; onToggle: (key: string) => void }) {
  return (
    <section className="card">
      <div className="card-row">
        <h2>Heute bemerkt</h2>
        <a href="/tagebuch" className="link-small">Tagebuch ›</a>
      </div>
      <div className="pills wrap">
        {QUICK_SYMPTOMS.map((s) => {
          const lvl = symptoms[s.key] ?? 0;
          return (
            <button key={s.key} type="button" className="pill chip" aria-pressed={lvl > 0} disabled={busy} onClick={() => onToggle(s.key)}>
              {s.label}
              {lvl > 0 ? ` · ${LEVELS[lvl]}` : ""}
            </button>
          );
        })}
      </div>
      <span className="meta">Ein Tipp speichert „mittel“. Die genaue Stärke stellst du im Tagebuch ein.</span>
    </section>
  );
}
