"use client";

import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { loadActivityOverrides, withOverrides, type Activity, type Daily } from "@/lib/garmin";
import type { Illness } from "@/lib/health";
import { markAutoRows, type Checkin, type Data, type Diary, type DoneSession, type Hub } from "@/lib/insights";
import { mergeGarminCycles, type GarminCycle } from "@/lib/garminZyklus";
import { shortName } from "@/lib/intakes";
import { sickDays } from "@/lib/baseline";
import { loadOvulation, withOvulation } from "@/lib/ovulation";
import type { MedIntake, MuscleDay, MusterExtra } from "@/lib/muster";

// Lädt alles, was Tagesziel und Muster brauchen (letzte 180 Tage)
export async function loadInsightData(days = 180): Promise<Data | null> {
  const sb = supabase();
  if (!sb) return null;
  const from = isoDay(daysAgo(days - 1));
  const [g, a, d, c, h, il, gc, ill, ov, so, ps] = await Promise.all([
    sb.from("garmin_daily").select("*").gte("day", from).order("day"),
    sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", from),
    sb.from("diary_entries").select("*").gte("day", from).order("day"),
    sb.from("checkins").select("day, energy, sleep, mood").gte("day", from),
    sb.from("medication_intakes").select("day").eq("as_needed", true).gte("day", from),
    sb.from("illnesses").select("*").is("ended_on", null).limit(1),
    sb.from("garmin_cycles").select("start_date, period_length").gte("start_date", from),
    sb.from("illnesses").select("started_on, ended_on").or(`ended_on.is.null,ended_on.gte.${from}`),
    loadOvulation(sb, from),
    loadActivityOverrides(sb, from),
    sb.from("planned_sessions").select("*").eq("status", "erledigt").gte("day", from),
  ]);
  if (g.error) throw new Error(g.error.message);
  return {
    daily: (g.data ?? []) as Daily[],
    acts: withOverrides((a.data ?? []) as Activity[], so),
    // Garmin-Zyklen füllen Lücken im Tagebuch; fehlt die Tabelle noch, bleibt es beim Tagebuch
    diary: withOvulation(mergeGarminCycles(markAutoRows((d.data ?? []) as (Diary & { manual?: boolean })[]), gc.error ? [] : ((gc.data ?? []) as GarminCycle[])), ov),
    checkins: (c.data ?? []) as Checkin[],
    hubs: (h.data ?? []) as Hub[],
    illness: ((il.data ?? []) as Illness[])[0] ?? null,
    done: ((ps.error ? [] : ps.data ?? []) as DoneSession[]).map((r) => ({ day: r.day, sport: r.sport, duration_min: r.duration_min ?? null, rpe: r.rpe ?? null })),
    sick: sickDays((ill.data ?? []) as Pick<Illness, "started_on" | "ended_on">[], isoDay()),
  };
}

// Zusätzlich für den Muster-Motor: Wadenkrämpfe, regelmäßige Einnahmen mit Namen, alle Erkrankungen.
// Fehlt die Tabelle muscle_events noch (Migration nicht gelaufen), bleibt die Liste leer.
export async function loadMusterExtra(days = 180): Promise<MusterExtra | null> {
  const sb = supabase();
  if (!sb) return null;
  const from = isoDay(daysAgo(days - 1));
  const [m, i, meds, il] = await Promise.all([
    sb.from("muscle_events").select("day, intensity, situation, swelling, numbness").gte("day", from),
    sb.from("medication_intakes").select("day, medication_id").eq("as_needed", false).gte("day", from),
    sb.from("medications").select("id, name"),
    sb.from("illnesses").select("*").or(`ended_on.is.null,ended_on.gte.${from}`),
  ]);
  const names = new Map(((meds.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]));
  const intakes: MedIntake[] = [];
  const seen = new Set<string>();
  for (const r of (i.data ?? []) as { day: string; medication_id: string }[]) {
    const name = names.get(r.medication_id);
    const k = r.day + "|" + name;
    if (name && !seen.has(k)) {
      seen.add(k);
      intakes.push({ day: r.day, name: shortName(name) });
    }
  }
  return {
    muscle: (m.data ?? []) as MuscleDay[],
    intakes,
    illnesses: (il.data ?? []) as Illness[],
  };
}
