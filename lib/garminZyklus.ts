// Zyklus aus Tagebuch und Garmin zusammenführen.
// Regel: Deine Einträge im Tagebuch haben Vorrang. Ein Garmin-Zyklus zählt nur,
// wenn im Tagebuch innerhalb von 3 Tagen um seinen Beginn keine Periode eingetragen ist.
// Garmin-Tage werden mit "leichter Blutung" (2) gezählt und als "aus Garmin" markiert.
// Fehlt die Tabelle garmin_cycles noch (Migration nicht ausgeführt), bleibt es beim Tagebuch.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Diary } from "@/lib/insights";

export type GarminCycle = { start_date: string; period_length: number | null };

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_PERIOD = 5;

// Periodentage aus Garmin, die das Tagebuch nicht schon abdeckt
export function garminPeriodDays(cycles: GarminCycle[], diaryBleedDays: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const c of cycles) {
    let covered = false;
    for (let i = -3; i <= 3 && !covered; i++) if (diaryBleedDays.has(addDays(c.start_date, i))) covered = true;
    if (covered) continue;
    const len = Math.min(10, Math.max(1, c.period_length ?? DEFAULT_PERIOD));
    for (let i = 0; i < len; i++) out.add(addDays(c.start_date, i));
  }
  return out;
}

// Tagebuch um Garmin-Periodentage ergänzen (für Zyklus-Seite, Tagesziel, Verlauf und Coach)
export function mergeGarminCycles(diary: Diary[], cycles: GarminCycle[]): Diary[] {
  const bleed = new Set(diary.filter((d) => d.bleeding >= 1).map((d) => d.day));
  const extra = garminPeriodDays(cycles, bleed);
  if (!extra.size) return diary;
  const byDay = new Map(diary.map((d) => [d.day, d]));
  for (const day of extra) {
    const e = byDay.get(day);
    byDay.set(day, e ? { ...e, bleeding: 2, fromGarmin: true } : { day, bleeding: 2, symptoms: {}, influences: [], fromGarmin: true, garminOnly: true });
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// Periodentage für Markierungen in Verlauf, Kalender und Körperwerten
export async function loadPeriodDays(sb: SupabaseClient, from: string, to?: string): Promise<Set<string>> {
  let dq = sb.from("diary_entries").select("day").gte("day", from).gt("bleeding", 0);
  if (to) dq = dq.lte("day", to);
  // Garmin-Zyklen etwas früher laden, damit eine Periode über den Monatsanfang mitzählt
  let gq = sb.from("garmin_cycles").select("start_date, period_length").gte("start_date", addDays(from, -10));
  if (to) gq = gq.lte("start_date", to);
  const [d, g] = await Promise.all([dq, gq]);
  const diaryDays = new Set<string>(((d.data ?? []) as { day: string }[]).map((r) => r.day));
  const all = new Set<string>(diaryDays);
  // Fehlt die Tabelle noch (SQL nicht ausgeführt), bleibt es beim Tagebuch
  if (!g.error) for (const day of garminPeriodDays((g.data ?? []) as GarminCycle[], diaryDays)) all.add(day);
  return all;
}

// Garmin-Zyklen ab einem Tag laden; bei Fehler (z. B. Tabelle fehlt) leer
export async function loadGarminCycles(sb: SupabaseClient, from: string): Promise<GarminCycle[]> {
  const { data, error } = await sb.from("garmin_cycles").select("start_date, period_length").gte("start_date", addDays(from, -10));
  return error ? [] : ((data ?? []) as GarminCycle[]);
}
