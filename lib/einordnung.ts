// Einordnung (Konzept docs/konzept-buendeln.md, Baustein 5): ein Wortschatz für „Wo stehe ich?“.
// Alle Stellen, die einen Wert zum Bereich oder zum Ziel einordnen, nehmen die Wörter von hier.
// Regeln aus CLAUDE.md: Farbe nie allein, keine Ampel für Erholung, Amber nur als Hinweis.

export type Lage = "unter" | "im" | "über";

/** Lage eines Werts zu einem Bereich */
export function lageIn(value: number, r: { lo: number; hi: number }): Lage {
  return value < r.lo ? "unter" : value > r.hi ? "über" : "im";
}

/** „im Bereich“ · „über deinem Bereich“ · „unter deinem Bereich“ */
export function bereichWort(l: Lage): string {
  return l === "im" ? "im Bereich" : `${l} deinem Bereich`;
}

/** „seit 3 Tagen über deinem Bereich“ */
export function bereichSeit(l: Lage, tage: number): string {
  return `seit ${tage} Tagen ${bereichWort(l)}`;
}

/** Liegt die Lage auf der ungünstigen Seite? (HRV: unter ist ungünstig, Ruhepuls: über) */
export function unguenstig(l: Lage, higherIsBetter: boolean): boolean {
  return higherIsBetter ? l === "unter" : l === "über";
}

/** Belastung zum Ziel: „unter dem Ziel“ · „im Ziel“ · „über dem Ziel“ · „Pause“ */
export function zielWort(wert: number, ziel: { lo: number; hi: number; pause?: boolean }): string {
  if (ziel.pause) return "Pause";
  const l = lageIn(wert, ziel);
  return l === "im" ? "im Ziel" : `${l} dem Ziel`;
}

/** Großer Anfangsbuchstabe für Überschriften und Bogen-Beschriftung */
export const gross = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
