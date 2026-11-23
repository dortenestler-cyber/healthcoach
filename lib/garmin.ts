"use client";

import { supabase } from "@/lib/supabase";
import { readLoadDay } from "@/lib/alltagslast";

export type Daily = {
  day: string;
  sleep_seconds: number | null;
  sleep_score: number | null;
  hrv_last_night: number | null;
  hrv_weekly_avg: number | null;
  hrv_status: string | null;
  resting_hr: number | null;
  stress_avg: number | null;
  bb_max: number | null;
  bb_min: number | null;
  bb_charged?: number | null; // Body Battery über Nacht aufgeladen
  steps: number | null;
  intensity_minutes: number | null;
  awake_count?: number | null; // wie oft in der Nacht wach
  spo2_avg?: number | null; // Sauerstoffsättigung im Schlaf, Schnitt in %
  spo2_low?: number | null; // niedrigster Wert im Schlaf in %
  // Schlafphasen in Sekunden (ab Migration 20261122150000_schlafphasen)
  sleep_deep_s?: number | null;
  sleep_rem_s?: number | null;
  sleep_light_s?: number | null;
  sleep_awake_s?: number | null;
  // Energie über den Tag (ab Migration 20261122170000_energie_tag)
  bb_curve?: (number | null)[] | null; // 96 Werte, alle 15 Minuten ab Mitternacht
  sleep_start_min?: number | null; // Einschlafen, Minuten seit Mitternacht (oft am Vortag)
  sleep_end_min?: number | null; // Aufwachen
  // Atemfrequenz und Stress im Detail (ab Migration 20261123090000_atem_stress)
  respiration_avg?: number | null; // Atemzüge pro Minute im Schlaf
  stress_rest_s?: number | null; // Sekunden in Ruhe (Stress 0–25)
  stress_low_s?: number | null; // niedrig (26–50)
  stress_medium_s?: number | null; // mittel (51–75)
  stress_high_s?: number | null; // hoch (76–100)
  stress_curve?: (number | null)[] | null; // 96 Werte, alle 15 Minuten ab Mitternacht
  // Belastung aus dem Alltag (ab Migration 20261124090000_alltagslast, Aufbau in lib/alltagslast.ts)
  load_daily_min?: unknown;
  hr_curve?: (number | null)[] | null; // Puls alle 15 Minuten
  steps_outside_acts?: number | null; // Schritte außerhalb von Garmin-Aktivitäten
  active_s?: number | null;
  highly_active_s?: number | null;
  active_kcal?: number | null;
  synced_at: string;
};

export type Activity = {
  activity_id: number;
  type_key: string | null;
  name: string | null;
  start_local: string | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  training_load: number | null;
  sport_override?: string | null; // eigene Zuordnung (Sammelliste Punkt 6), „ignorieren“ = nicht zuordnen
  sport_label?: string | null; // eigener Name bei „Anderes“
};

// Eigene Zuordnungen laden. Fehlt die Spalte noch (Migration nicht gelaufen), kommt null zurück.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadActivityOverrides(sb: any, from: string): Promise<Map<number, { sport: string; label: string | null }> | null> {
  const { data, error } = await sb.from("garmin_activities").select("activity_id, sport_override, sport_label").gte("start_local", from).not("sport_override", "is", null);
  if (error) return null;
  return new Map(((data ?? []) as { activity_id: number; sport_override: string; sport_label: string | null }[]).map((r) => [r.activity_id, { sport: r.sport_override, label: r.sport_label }]));
}

export function withOverrides(acts: Activity[], ov: Map<number, { sport: string; label: string | null }> | null): Activity[] {
  if (!ov?.size) return acts;
  return acts.map((a) => (ov.has(a.activity_id) ? { ...a, sport_override: ov.get(a.activity_id)!.sport, sport_label: ov.get(a.activity_id)!.label } : a));
}

export type MetricKey = "schlaf" | "hrv" | "ruhepuls" | "atem" | "bb" | "stress" | "schritte" | "tiefschlaf" | "rem" | "einschlafen" | "bb_aufgeladen" | "stress_hoch" | "belastung" | "alltagsschritte";

function minutes(v: number): string {
  const m = Math.round(v);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

// Belastung in % (150 Garmin-Last = 100 %) aus Training und Alltag des Tages
function dayLoadPct(d: Daily): number | null {
  const ld = readLoadDay(d.load_daily_min);
  if (!ld) return null;
  return Math.min(100, ((ld.last_training ?? 0) + Math.max(0, ld.last_alltag ?? 0)) / 1.5);
}

// higherIsBetter steuert, ob "unter dem Schnitt" als Hinweis gilt
export const METRICS: Record<MetricKey, { label: string; value: (d: Daily) => number | null; fmt: (v: number) => string; higherIsBetter: boolean }> = {
  schlaf: {
    label: "Schlaf",
    value: (d) => (d.sleep_seconds ? d.sleep_seconds / 3600 : null),
    fmt: (v) => {
      const h = Math.floor(v);
      const m = Math.round((v - h) * 60);
      return `${h}:${String(m === 60 ? 59 : m).padStart(2, "0")} h`;
    },
    higherIsBetter: true,
  },
  hrv: { label: "HRV", value: (d) => d.hrv_last_night, fmt: (v) => `${Math.round(v)} ms`, higherIsBetter: true },
  ruhepuls: { label: "Ruhepuls", value: (d) => d.resting_hr, fmt: (v) => `${Math.round(v)} bpm`, higherIsBetter: false },
  atem: {
    label: "Atemfrequenz",
    value: (d) => (typeof d.respiration_avg === "number" ? Number(d.respiration_avg) : null),
    fmt: (v) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /min`,
    higherIsBetter: false,
  },
  bb: { label: "Body Battery", value: (d) => d.bb_max, fmt: (v) => String(Math.round(v)), higherIsBetter: true },
  stress: { label: "Stress", value: (d) => d.stress_avg, fmt: (v) => String(Math.round(v)), higherIsBetter: false },
  schritte: { label: "Schritte", value: (d) => d.steps, fmt: (v) => Math.round(v).toLocaleString("de-DE"), higherIsBetter: true },
  // Weitere Korridore (Konzept Korridore und Alltagslast, A3)
  tiefschlaf: { label: "Tiefschlaf", value: (d) => (d.sleep_deep_s ? d.sleep_deep_s / 60 : null), fmt: minutes, higherIsBetter: true },
  rem: { label: "REM-Schlaf", value: (d) => (d.sleep_rem_s ? d.sleep_rem_s / 60 : null), fmt: minutes, higherIsBetter: true },
  // Einschlafen als Minuten ab Mittag des Vortags gedacht: 23:30 = 1410, 0:30 = 1470, damit Mitternacht keinen Sprung macht
  einschlafen: {
    label: "Einschlafen",
    value: (d) => (typeof d.sleep_start_min === "number" ? (d.sleep_start_min < 12 * 60 ? d.sleep_start_min + 1440 : d.sleep_start_min) : null),
    fmt: (v) => {
      const m = Math.round(v) % 1440;
      return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} Uhr`;
    },
    higherIsBetter: false,
  },
  bb_aufgeladen: { label: "Body Battery aufgeladen", value: (d) => d.bb_charged ?? null, fmt: (v) => `+${Math.round(v)}`, higherIsBetter: true },
  stress_hoch: { label: "Hoher Stress", value: (d) => (typeof d.stress_high_s === "number" ? d.stress_high_s / 60 : null), fmt: minutes, higherIsBetter: false },
  // Tagesbelastung aus Training und Alltag, nur an Tagen mit Alltagsdaten (lib/alltagslast.ts)
  belastung: { label: "Belastung", value: (d) => dayLoadPct(d), fmt: (v) => `${Math.round(v)} %`, higherIsBetter: true },
  alltagsschritte: { label: "Schritte im Alltag", value: (d) => d.steps_outside_acts ?? null, fmt: (v) => Math.round(v).toLocaleString("de-DE"), higherIsBetter: true },
};

// Werte, die nur angezeigt werden, wenn es dafür Daten gibt (Auswahl im Verlauf)
export const OPTIONAL_METRICS: MetricKey[] = ["atem", "tiefschlaf", "rem", "einschlafen", "bb_aufgeladen", "stress_hoch", "belastung", "alltagsschritte"];

export function stats(values: number[]) {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return { mean, sd, min: Math.min(...values), max: Math.max(...values) };
}

export type SyncResult = { ok: boolean; error?: string; sleepStagesNote?: string; energyNote?: string; stressNote?: string };

export async function syncGarmin(days: number, offset = 0): Promise<SyncResult> {
  const sb = supabase();
  if (!sb) return { ok: false, error: "Supabase ist nicht verbunden." };
  const { data, error } = await sb.functions.invoke("garmin-sync", { body: { days, offset } });
  if (error) {
    // Fehlertext aus der Funktion lesen, falls vorhanden
    let detail = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch {
      // Standardtext behalten
    }
    return { ok: false, error: detail };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, sleepStagesNote: data?.sleepStagesNote, energyNote: data?.energyNote, stressNote: data?.stressNote };
}

const TYPE_LABELS: Record<string, string> = {
  running: "Joggen",
  trail_running: "Trailrunning",
  treadmill_running: "Laufband",
  walking: "Gehen",
  hiking: "Wandern",
  cycling: "Rad fahren",
  road_biking: "Rennrad",
  mountain_biking: "Mountainbike",
  indoor_cycling: "Indoor-Rad",
  bouldering: "Bouldern",
  indoor_climbing: "Hallenklettern",
  rock_climbing: "Klettern",
  strength_training: "Krafttraining",
  hiit: "HIIT",
  yoga: "Yoga",
  pilates: "Pilates",
  mixed_martial_arts: "Kampfsport",
  boxing: "Kampfsport",
  breathwork: "Atemübung",
  other: "Sonstiges",
};

// Name einer Aktivität: eigener Name, sonst eigene Sportart (Karate …), sonst die Garmin-Sportart
const OWN_LABELS: Record<string, string> = { karate: "Karate", kettlebell: "Kettlebell", klettern: "Bouldern", ausdauer: "Ausdauer" };
export function activityLabel(a: Activity): string {
  if (a.sport_label) return a.sport_label;
  if (a.sport_override && OWN_LABELS[a.sport_override]) return OWN_LABELS[a.sport_override];
  const k = a.type_key ?? "other";
  return TYPE_LABELS[k] ?? (a.name || k.replace(/_/g, " "));
}

export function durationText(s: number | null): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")} h` : `${m} min`;
}

export function distanceText(m: number | null): string {
  if (!m || m < 50) return "";
  return `${(m / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
}
