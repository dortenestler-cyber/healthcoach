// Kopf jeder Wert-Karte in fester Reihenfolge: Satz, Zahl, Bereich. Die Grafik folgt als children.

import type { ReactNode } from "react";
import { NO_RANGE_TEXT, type Range } from "@/lib/baseline";

type Props = {
  meta: string; // kleine Zeile oben, z. B. „HRV · letzte Nacht“
  sentence: string; // Satz, der das Ergebnis nennt
  value: string | null; // große Zahl mit Einheit
  fmt?: (v: number) => string;
  range?: Range | null;
  phase?: Range | null; // Bereich der heutigen Zyklusphase: beide Bereiche werden genannt
  phaseName?: string; // z. B. „Lutealphase“
  children?: ReactNode;
};

export default function ValueHeader({ meta, sentence, value, fmt = (v) => String(Math.round(v)), range, phase, phaseName = "Phase", children }: Props) {
  const rangeText =
    range === undefined
      ? null
      : phase
        ? `Bereich ${phaseName} ${fmt(phase.lo)}–${fmt(phase.hi)}${phase.stable ? "" : " (vorläufig)"} · 30 Tage ${range ? `${fmt(range.lo)}–${fmt(range.hi)}` : "–"}`
        : range
          ? `Dein Bereich ${fmt(range.lo)}–${fmt(range.hi)}${range.stable ? "" : " · vorläufig"}`
          : NO_RANGE_TEXT;
  return (
    <>
      <span className="meta">{meta}</span>
      <h2>{sentence}</h2>
      <p className="value-big">{value ?? "–"}</p>
      {rangeText && <p className="value-range">{rangeText}</p>}
      {children}
    </>
  );
}
