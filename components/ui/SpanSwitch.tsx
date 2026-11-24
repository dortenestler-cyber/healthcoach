"use client";

// Zeitraum-Umschalter für die ganze App (lib/zeitraum.ts). options: welche Tasten, z. B. ohne „1 J“, wenn die Daten nicht reichen.
import { STANDARD, zeitraum, type Zeitraum } from "@/lib/zeitraum";

export default function SpanSwitch({ value, onChange, options = STANDARD }: { value: Zeitraum; onChange: (z: Zeitraum) => void; options?: Zeitraum[] }) {
  return (
    <div className={`segmented segmented-${options.length}`} role="group" aria-label="Zeitraum">
      {options.map((k) => {
        const z = zeitraum(k);
        return (
          <button key={k} type="button" aria-pressed={value === k} aria-label={z.name} onClick={() => onChange(k)}>
            {z.label}
          </button>
        );
      })}
    </div>
  );
}
