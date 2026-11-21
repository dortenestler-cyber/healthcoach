"use client";

import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import type { Activity, Daily } from "@/lib/garmin";
import type { Illness } from "@/lib/health";
import type { Checkin, Data, Diary, Hub } from "@/lib/insights";

// Lädt alles, was Tagesziel und Muster brauchen (letzte 180 Tage)
export async function loadInsightData(days = 180): Promise<Data | null> {
  const sb = supabase();
  if (!sb) return null;
  const from = isoDay(daysAgo(days - 1));
  const [g, a, d, c, h, il] = await Promise.all([
    sb.from("garmin_daily").select("*").gte("day", from).order("day"),
    sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load").gte("start_local", from),
    sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", from).order("day"),
    sb.from("checkins").select("day, energy, sleep, mood").gte("day", from),
    sb.from("medication_intakes").select("day").eq("as_needed", true).gte("day", from),
    sb.from("illnesses").select("*").is("ended_on", null).limit(1),
  ]);
  if (g.error) throw new Error(g.error.message);
  return {
    daily: (g.data ?? []) as Daily[],
    acts: (a.data ?? []) as Activity[],
    diary: (d.data ?? []) as Diary[],
    checkins: (c.data ?? []) as Checkin[],
    hubs: (h.data ?? []) as Hub[],
    illness: ((il.data ?? []) as Illness[])[0] ?? null,
  };
}
