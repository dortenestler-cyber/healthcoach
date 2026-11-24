// Health Coach · Belastung aus dem Alltag: Aufbau der Spalte garmin_daily.load_daily_min
// Wird von garmin-sync geschrieben (supabase/functions/garmin-sync/alltag.ts, gleicher Aufbau).
// Konzept: docs/konzept-korridore-alltagslast.md, Teil B. Ab Migration 20261124090000_alltagslast.

export type LoadDay = {
  /** 1: erste Fassung (Alltag ab Zone 2) · 2: ab 22.11., Zone 1 zählt ab 10 Minuten am Stück · 3: ab 24.11., leichte Bewegung zählt halb */
  v: 1 | 2 | 3;
  /** "puls": aus dem Tagespuls · "schritte": Uhr kaum getragen, Alltag geschätzt aus Schritten */
  quelle: "puls" | "schritte";
  /** woran Bewegung im Alltag erkannt wurde: "stress" = Stresswert „Bewegung“ von Garmin,
   *  "dauer" = Zone 1 zählt ab 10 Minuten am Stück, Zone 2 und höher immer (ältere Werte: "keine", "schritte") */
  bewegung: "stress" | "dauer" | "keine" | "schritte";
  /** Minuten je Zone 0–5 während Garmin-Aktivitäten */
  training: number[];
  /** Minuten je Zone 0–5 außerhalb von Aktivitäten, die zählen (ab Zone 1, Regel siehe bewegung) */
  alltag: number[];
  /** Minuten leichte Bewegung im Alltag (ab 20 %, unter Zone 1, halbes Gewicht), erst ab Version 3 */
  leicht?: number;
  /** Minuten ab Zone 1, die nicht zur Belastung zählen (ohne Bewegung oder Zone 1 kürzer als 10 Minuten) */
  ohne_bewegung: number;
  /** Pulspunkte = Minuten × Zonengewicht (leicht = 0,5, Zone 1 = 1 … Zone 5 = 5) */
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

/** 100 % entspricht grob einem harten Trainingstag: 150 Garmin-Last */
export const FULL_DAY_LOAD = 150;

// Skala wie bei Bevel (Konzept docs/konzept-belastung-skala.md, Nutzerin 24.11.): Die Belastung flacht nach oben ab.
// Prozent = 100 × ln(1 + Last ÷ 100) ÷ ln(1 + 150 ÷ 100). 150 Last bleibt 100 %, darüber geht es langsam weiter.
// Gleiche Rechnung in supabase/functions/watch/index.ts (loadToPct).
const LOAD_CURVE = 100;
export function loadToPct(load: number): number {
  return load > 0 ? (100 * Math.log(1 + load / LOAD_CURVE)) / Math.log(1 + FULL_DAY_LOAD / LOAD_CURVE) : 0;
}

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
  if ((o.v !== 1 && o.v !== 2 && o.v !== 3) || !Array.isArray(o.training) || !Array.isArray(o.alltag)) return null;
  return o as LoadDay;
}

/** Minuten in Bewegung im Alltag (leichte Bewegung und ab Zone 1) */
export function alltagMinutes(l: LoadDay): number {
  return Math.round(l.alltag.slice(1).reduce((a, b) => a + b, 0) + (l.leicht ?? 0));
}
