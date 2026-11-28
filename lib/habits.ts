"use client";

// Gewohnheiten (früher „Einflüsse“): Liste mit Reihenfolge und Sichtbarkeit in den Einstellungen (settings.data.habits),
// eigene Gewohnheiten möglich. Eingetragen wird im Tagebuch (diary_entries.influences), Details für die Sauna
// in diary_entries.habit_details (ab Migration 20261123100000_gewohnheiten).

import type { SupabaseClient } from "@supabase/supabase-js";
import { INFLUENCES, LEGACY_HABIT_LABELS } from "@/lib/catalog";
import { loadSettings, saveSettings } from "@/lib/training";

export type Habit = { key: string; label: string; on: boolean; custom?: boolean };
export type SaunaDetails = { gaenge?: string; wann?: string; kaeltebecken?: boolean };
export type HabitDetails = { sauna?: SaunaDetails; [k: string]: unknown };

export const SAUNA_GAENGE = ["1", "2", "3", "4+"];
export const SAUNA_WANN = ["morgens", "tagsüber", "abends"];
export const WANN_LABEL: Record<string, string> = { morgens: "Morgens", "tagsüber": "Tagsüber", abends: "Abends" };
export const HAS_DETAILS = new Set(["sauna"]);

export const DEFAULT_HABITS: Habit[] = INFLUENCES.map((i) => ({ key: i.key, label: i.label, on: true }));

// Gespeicherte Liste plus Standard-Gewohnheiten, die neu dazugekommen sind
export function habitsFrom(stored: unknown): Habit[] {
  const list = Array.isArray(stored) ? (stored as Habit[]).filter((h) => h && typeof h.key === "string" && typeof h.label === "string") : [];
  const keys = new Set(list.map((h) => h.key));
  return [...list.map((h) => (h.key in LEGACY_HABIT_LABELS ? { key: h.key, label: LEGACY_HABIT_LABELS[h.key], on: false, custom: false } : { key: h.key, label: h.label, on: h.on !== false, custom: !!h.custom })), ...DEFAULT_HABITS.filter((h) => !keys.has(h.key))];
}

export async function loadHabits(sb: SupabaseClient): Promise<Habit[]> {
  const s = await loadSettings(sb);
  return habitsFrom(s.habits);
}

// Nur die Liste ändern, alle anderen Einstellungen bleiben
export async function saveHabits(sb: SupabaseClient, habits: Habit[]): Promise<string | null> {
  const s = await loadSettings(sb);
  const { error } = await saveSettings(sb, { ...s, habits });
  return error ? error.message : null;
}

export const habitKey = (label: string) =>
  "eigen_" +
  label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);

export const labelOf = (habits: Habit[], key: string) => habits.find((h) => h.key === key)?.label ?? INFLUENCES.find((i) => i.key === key)?.label ?? LEGACY_HABIT_LABELS[key] ?? key;

// Details aus der Datenbank laden. Fehlt die Spalte noch (Migration nicht gelaufen), gibt es einfach keine Details.
export async function loadHabitDetails(sb: SupabaseClient, from: string, to?: string): Promise<Map<string, HabitDetails>> {
  let q = sb.from("diary_entries").select("day, habit_details").gte("day", from);
  if (to) q = q.lte("day", to);
  const { data, error } = await q;
  if (error) return new Map();
  return new Map(((data ?? []) as { day: string; habit_details: HabitDetails | null }[]).map((r) => [r.day, r.habit_details ?? {}]));
}
