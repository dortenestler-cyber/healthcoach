// Getränke (Tabelle drink_log, Migration 20261203090000_getraenke): Uhr und App tragen einzeln mit Uhrzeit ein.
// Wasser in Litern, Kaffee und Tee in Tassen, Alkohol in Gläsern. Die Haken „Koffein nach 14 Uhr“ und „Alkohol“
// setzt die Datenbank aus dem Log. Wasserziel: Standard 2 L, an Trainingstagen 2,5 L (Einstellungen).

export type DrinkKind = "wasser" | "kaffee" | "tee" | "alkohol";
export type DrinkRow = { id: string; at: string; day: string; kind: DrinkKind; amount: number; source: "app" | "uhr" };

export const DRINK_LABEL: Record<DrinkKind, string> = { wasser: "Wasser", kaffee: "Kaffee", tee: "Tee", alkohol: "Alkohol" };

// Schnelleinträge in der App: Art, Menge, Beschriftung
export const DRINK_QUICK: { kind: DrinkKind; amount: number; label: string }[] = [
  { kind: "wasser", amount: 0.25, label: "Wasser 0,25 L" },
  { kind: "wasser", amount: 0.5, label: "Wasser 0,5 L" },
  { kind: "wasser", amount: 1, label: "Wasser 1 L" },
  { kind: "kaffee", amount: 1, label: "Kaffee" },
  { kind: "tee", amount: 1, label: "Tee" },
  { kind: "alkohol", amount: 1, label: "Alkohol" },
];

export const DEFAULT_WATER_GOAL = 2;
export const DEFAULT_WATER_GOAL_TRAINING = 2.5;

export const fmtAmount = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export function amountText(kind: DrinkKind, amount: number): string {
  if (kind === "wasser") return `${fmtAmount(amount)} L`;
  if (kind === "alkohol") return `${fmtAmount(amount)} ${amount === 1 ? "Glas" : "Gläser"}`;
  return `${fmtAmount(amount)} ${amount === 1 ? "Tasse" : "Tassen"}`;
}

export const timeOf = (at: string) => new Date(at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

// Kaffee ab 14:00 zählt als „nach 14 Uhr“ (wie in der Datenbank)
export const isLate = (r: DrinkRow) => r.kind === "kaffee" && new Date(r.at).getHours() >= 14;

export function totals(rows: DrinkRow[]) {
  const sum = (k: DrinkKind) => Math.round(rows.filter((r) => r.kind === k).reduce((a, r) => a + Number(r.amount), 0) * 100) / 100;
  return { wasser: sum("wasser"), kaffee: sum("kaffee"), tee: sum("tee"), alkohol: sum("alkohol") };
}

// Anrechnung aufs Tagesziel: eine Tasse oder ein Glas zählt als 0,2 L Flüssigkeit, davon der Anteil je Getränk.
// Die Faktoren sind Schätzungen ohne Quelle und in den Einstellungen änderbar (settings.data.drinkFactors, 0 bis 1).
export const CUP_L = 0.2;
export type DrinkFactors = { kaffee: number; tee: number; alkohol: number };
export const DEFAULT_FACTORS: DrinkFactors = { kaffee: 0.8, tee: 0.9, alkohol: 0 };

export function factorsFrom(settings: Record<string, unknown>): DrinkFactors {
  const f = (settings.drinkFactors ?? {}) as Record<string, unknown>;
  const pick = (k: keyof DrinkFactors) => (typeof f[k] === "number" && (f[k] as number) >= 0 && (f[k] as number) <= 1 ? (f[k] as number) : DEFAULT_FACTORS[k]);
  return { kaffee: pick("kaffee"), tee: pick("tee"), alkohol: pick("alkohol") };
}

// Angerechnete Flüssigkeit in Litern
export function fluidOf(t: ReturnType<typeof totals>, f: DrinkFactors): number {
  return Math.round((t.wasser + CUP_L * (t.kaffee * f.kaffee + t.tee * f.tee + t.alkohol * f.alkohol)) * 100) / 100;
}
