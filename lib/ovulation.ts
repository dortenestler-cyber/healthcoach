"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Diary } from "@/lib/insights";

// Eisprung-Zeichen, die die Nutzerin im Tagebuch selbst einträgt (Sammelliste Punkt 10).
// Gespeichert in diary_entries.ovulation_signs. Fehlt die Spalte noch, bleibt alles leer und die App schätzt wie bisher.
export const OVULATION_SIGNS: { key: string; label: string }[] = [
  { key: "test", label: "Test positiv" },
  { key: "mittelschmerz", label: "Mittelschmerz" },
  { key: "schleim", label: "Zervixschleim spinnbar" },
  { key: "temperatur", label: "Temperaturanstieg" },
];

export async function loadOvulation(sb: SupabaseClient, from: string): Promise<Map<string, string[]>> {
  const { data, error } = await sb.from("diary_entries").select("day, ovulation_signs").gte("day", from);
  const out = new Map<string, string[]>();
  if (error) return out;
  for (const r of (data ?? []) as { day: string; ovulation_signs: string[] | null }[]) {
    if (r.ovulation_signs?.length) out.set(r.day, r.ovulation_signs);
  }
  return out;
}

export function withOvulation(diary: Diary[], signs: Map<string, string[]>): Diary[] {
  if (!signs.size) return diary;
  return diary.map((d) => (signs.has(d.day) ? { ...d, ovulation: signs.get(d.day) } : d));
}
