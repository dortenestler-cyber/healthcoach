// Kopf jeder Wert-Karte in fester Reihenfolge: Satz, Zahl, Bereich. Die Grafik folgt als children.

import type { ReactNode } from "react";
import { NO_RANGE_TEXT, type Range } from "@/lib/baseline";

type Props = {
  meta: string; // kleine Zeile oben, z. B. „HRV · letzte Nacht“
  sentence: string; // Satz, der das Ergebnis nennt
  value: string | null; // große Zahl mit Einheit
  fmt?: (v: number) => string;
  range?: Range | null;
  luteal?: Range | null; // in der Lutealphase: eigener Bereich, beide werden genannt
  children?: ReactNode;
};

export default function ValueHeader({ meta, sentence, value, fmt = (v) => String(Math.round(v)), range, luteal, children }: Props) {
  const rangeText =
    range === undefined
      ? null
      : luteal
        ? `Bereich Lutealphase ${fmt(luteal.lo)}–${fmt(luteal.hi)} · 30 Tage ${range ? `${fmt(range.lo)}–${fmt(range.hi)}` : "–"}`
        : range
          ? `Dein Bereich ${fmt(range.lo)}–${fmt(range.hi)}`
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
