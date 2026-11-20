"use client";

import { supabase } from "@/lib/supabase";

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
  steps: number | null;
  intensity_minutes: number | null;
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
};

export type MetricKey = "schlaf" | "hrv" | "ruhepuls" | "bb" | "stress" | "schritte";

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
  bb: { label: "Body Battery", value: (d) => d.bb_max, fmt: (v) => String(Math.round(v)), higherIsBetter: true },
  stress: { label: "Stress", value: (d) => d.stress_avg, fmt: (v) => String(Math.round(v)), higherIsBetter: false },
  schritte: { label: "Schritte", value: (d) => d.steps, fmt: (v) => Math.round(v).toLocaleString("de-DE"), higherIsBetter: true },
};

export function stats(values: number[]) {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return { mean, sd, min: Math.min(...values), max: Math.max(...values) };
}

export async function syncGarmin(days: number, offset = 0): Promise<{ ok: boolean; error?: string }> {
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
  return { ok: true };
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

export function activityLabel(a: Activity): string {
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
