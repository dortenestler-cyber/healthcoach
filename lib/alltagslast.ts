// Health Coach · Belastung aus dem Alltag: Aufbau der Spalte garmin_daily.load_daily_min
// Wird von garmin-sync geschrieben (supabase/functions/garmin-sync/alltag.ts, gleicher Aufbau).
// Konzept: docs/konzept-korridore-alltagslast.md, Teil B. Ab Migration 20261124090000_alltagslast.

export type LoadDay = {
  v: 1;
  /** "puls": aus dem Tagespuls · "schritte": Uhr kaum getragen, Alltag geschätzt aus Schritten */
  quelle: "puls" | "schritte";
  /** woran Bewegung im Alltag erkannt wurde; "keine": Alltag zählt erst ab Zone 2 */
  bewegung: "schritte" | "stress" | "keine";
  /** Minuten je Zone 0–5 während Garmin-Aktivitäten */
  training: number[];
  /** Minuten je Zone 0–5 außerhalb von Aktivitäten (ab Zone 1 nur mit Bewegung) */
  alltag: number[];
  /** Minuten ab Zone 1 ohne Bewegung (z. B. Stress), zählen nicht zur Belastung */
  ohne_bewegung: number;
  /** Pulspunkte = Minuten × Zonengewicht (Zone 1 = 1 … Zone 5 = 5) */
  pkt_training: number;
  pkt_alltag: number;
  /** Minuten mit Pulsdaten */
  abdeckung: number;
  puls_ruhe: number;
  puls_max: number;
  puls_max_quelle: "aktivitaeten" | "startwert";
  /** Garmin-Trainingsbelastung der Aktivitäten des Tages */
  last_training: number;
  /** Garmin-Last pro Pulspunkt, Median der letzten 30 Trainings; null = noch Startwert */
  faktor: number | null;
  faktor_n: number;
  /** Alltag umgerechnet in Garmin-Last, gleiche Einheit wie last_training */
  last_alltag: number | null;
};

/** Zonen für Anzeige und Einstellungen: Anteil zwischen Ruhepuls und Maximalpuls */
export const LOAD_ZONES = [
  { zone: 0, name: "Ruhe", von: 0, bis: 0.3, gewicht: 0 },
  { zone: 1, name: "locker", von: 0.3, bis: 0.5, gewicht: 1 },
  { zone: 2, name: "zügig", von: 0.5, bis: 0.6, gewicht: 2 },
  { zone: 3, name: "mittel", von: 0.6, bis: 0.7, gewicht: 3 },
  { zone: 4, name: "hart", von: 0.7, bis: 0.8, gewicht: 4 },
  { zone: 5, name: "sehr hart", von: 0.8, bis: 1, gewicht: 5 },
] as const;

/** Liest die Spalte sicher; alte Zeilen oder fremde Formen ergeben null */
export function readLoadDay(v: unknown): LoadDay | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<LoadDay>;
  if (o.v !== 1 || !Array.isArray(o.training) || !Array.isArray(o.alltag)) return null;
  return o as LoadDay;
}

/** Minuten in Bewegung im Alltag (ab Zone 1) */
export function alltagMinutes(l: LoadDay): number {
  return Math.round(l.alltag.slice(1).reduce((a, b) => a + b, 0));
}
