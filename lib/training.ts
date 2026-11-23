"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { daysAgo, isoDay } from "@/lib/dates";
import { illnessRule, SPOTS, type Illness, type Injury } from "@/lib/health";

export type Sport = "karate" | "kettlebell" | "klettern" | "ausdauer" | "sonstiges";

// Sportfarben: alle aus der Familie Training (Slate-Blau), Ausdauer sehr hell (Türkis gehört zu Stress). Werte in app/globals.css (hell und dunkel). Immer mit Text-Label.
export const SPORTS: Record<Sport, { label: string; color: string }> = {
  karate: { label: "Karate", color: "var(--sport-karate)" },
  kettlebell: { label: "Kettlebell", color: "var(--sport-kettlebell)" },
  klettern: { label: "Bouldern", color: "var(--sport-klettern)" },
  ausdauer: { label: "Ausdauer", color: "var(--sport-ausdauer)" },
  sonstiges: { label: "Sonstiges", color: "var(--sport-sonstiges)" },
};

export type Session = {
  id: string;
  day: string;
  sport: Sport;
  time: string | null;
  source: "vorlage" | "eigen";
  status: "geplant" | "erledigt" | "ausgelassen";
  note: string | null;
};

// Garmin-Sportarten den Bereichen der App zuordnen
export function sportOfGarmin(typeKey: string | null): Sport {
  const k = typeKey ?? "";
  if (/martial|boxing|karate|kickbox/.test(k)) return "karate";
  if (/boulder|climb/.test(k)) return "klettern";
  if (/strength|hiit|kettlebell/.test(k)) return "kettlebell";
  if (/run|walk|hik|cycl|bik|swim|row|elliptical/.test(k)) return "ausdauer";
  return "sonstiges";
}

// Sportart einer Aktivität: eigene Zuordnung vor der Garmin-Sportart (Sammelliste Punkt 6)
const OWN: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer", "sonstiges"];
export function sportOf(a: { type_key: string | null; sport_override?: string | null }): Sport {
  const o = a.sport_override;
  if (o && (OWN as string[]).includes(o)) return o as Sport;
  if (o === "ignorieren") return "sonstiges";
  return sportOfGarmin(a.type_key);
}

// Wochenvorlage: Wochentag (1 = Montag … 7 = Sonntag) → Sportarten. Montag Karate ist fest.
export type WeekTemplate = Record<string, Sport[]>;
export const DEFAULT_WEEK: WeekTemplate = { "1": ["karate"], "3": ["kettlebell"], "5": ["kettlebell"], "6": ["klettern"] };
export const DEFAULT_TIMES: Partial<Record<Sport, string>> = { karate: "19:00", kettlebell: "18:00", klettern: "10:00" };
export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1;
export const fromIso = (s: string) => new Date(s + "T12:00:00");

export type Settings = { week?: WeekTemplate; generatedUntil?: string; examDate?: string; [k: string]: unknown };

export async function loadSettings(sb: SupabaseClient): Promise<Settings> {
  const { data } = await sb.from("settings").select("data").maybeSingle();
  return ((data as { data?: Settings } | null)?.data ?? {}) as Settings;
}

export async function saveSettings(sb: SupabaseClient, s: Settings) {
  return sb.from("settings").upsert({ data: s, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

// Legt Einheiten aus der Wochenvorlage für die nächsten 4 Wochen an, nur für Tage, die noch nicht erzeugt wurden.
export async function ensurePlanned(sb: SupabaseClient, settings: Settings): Promise<Settings> {
  const week = settings.week ?? DEFAULT_WEEK;
  const until = isoDay(daysAgo(-28));
  const startAfter = settings.generatedUntil && settings.generatedUntil >= isoDay(daysAgo(1)) ? settings.generatedUntil : isoDay(daysAgo(1));
  if (startAfter >= until) return settings;
  const rows: { day: string; sport: Sport; time: string | null; source: "vorlage" }[] = [];
  for (let i = 0; i <= 28; i++) {
    const d = daysAgo(-i);
    const day = isoDay(d);
    if (day <= startAfter) continue;
    for (const sport of week[String(isoWeekday(d))] ?? []) rows.push({ day, sport, time: DEFAULT_TIMES[sport] ?? null, source: "vorlage" });
  }
  if (rows.length) {
    const { error } = await sb.from("planned_sessions").upsert(rows, { onConflict: "user_id,day,sport,source", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  const next = { ...settings, week, generatedUntil: until };
  await saveSettings(sb, next);
  return next;
}

// Neue Wochenvorlage: künftige, noch offene Vorlage-Einheiten ersetzen
export async function applyWeek(sb: SupabaseClient, settings: Settings, week: WeekTemplate): Promise<Settings> {
  const { error } = await sb.from("planned_sessions").delete().eq("source", "vorlage").eq("status", "geplant").gte("day", isoDay());
  if (error) throw new Error(error.message);
  return ensurePlanned(sb, { ...settings, week, generatedUntil: isoDay(daysAgo(1)) });
}

// Gesundheit wirkt auf den Plan: Pause bei Krankheit, Sperre bei Verletzung
export function healthEffect(sport: Sport, day: string, illness: Illness | null, injuries: Injury[]): { kind: "pause" | "gesperrt" | "angepasst"; text: string } | null {
  if (day < isoDay()) return null;
  if (illness) {
    const r = illnessRule(illness);
    if (r.stop && day <= isoDay(daysAgo(-2))) return { kind: "pause", text: `${illness.label}: Pause` };
    if (!r.stop && day === isoDay()) return { kind: "angepasst", text: `${illness.label}: nur leicht` };
  }
  for (const inj of injuries) {
    const s = SPOTS[inj.spot];
    if (!s) continue;
    if (s.sports.includes(sport)) return { kind: "gesperrt", text: `${s.label} verletzt: pausiert` };
    if (sport === "karate" || sport === "kettlebell") {
      const hit = s.rows.find(([w]) => (sport === "karate" ? /karate|kumite|tritt|schl|fauststö/i : /swing|clean|goblet|liegest|ausfall|kettlebell/i).test(w));
      if (hit) return { kind: "angepasst", text: `${s.label}: ${hit[1]}` };
    }
  }
  return null;
}

// ---------- Kettlebell

export type KbPlan = { id: string; name: string; goal: string | null; weeks: number; per_week: number; step_kg: number; step_every_weeks: number; start_date: string; active: boolean };
export type KbItem = { id: string; plan_id: string; pos: number; exercise: string; sets: number; reps: number; weight_kg: number; per_side: boolean };
export type KbSet = { day: string; exercise: string; set_no: number; reps: number; weight_kg: number; target_reps: number | null; target_kg: number | null; plan_id: string | null };

export const KB_TEMPLATE = {
  name: "Kraft-Grundlage",
  goal: "Allgemeiner Kraftaufbau, Technik sauber, Gewicht langsam steigern",
  weeks: 8,
  per_week: 2,
  step_kg: 1,
  step_every_weeks: 2,
  items: [
    { exercise: "Swing", sets: 3, reps: 15, weight_kg: 16, per_side: false },
    { exercise: "Goblet Squat", sets: 3, reps: 10, weight_kg: 12, per_side: false },
    { exercise: "Clean & Press", sets: 3, reps: 6, weight_kg: 8, per_side: true },
    { exercise: "Liegestütz", sets: 3, reps: 8, weight_kg: 0, per_side: false },
    { exercise: "Ausfallschritt", sets: 3, reps: 10, weight_kg: 8, per_side: true },
  ],
};

export function planWeek(plan: KbPlan): number {
  const days = Math.floor((fromIso(isoDay()).getTime() - fromIso(plan.start_date).getTime()) / 864e5);
  return Math.max(1, Math.min(plan.weeks, Math.floor(days / 7) + 1));
}

// Zielgewicht dieser Woche: Startgewicht plus Steigerung, höchstens 20 kg; Körpergewicht bleibt 0
export function targetKg(item: KbItem, plan: KbPlan, lighter = false): number {
  if (item.weight_kg === 0) return 0;
  const steps = Math.floor((planWeek(plan) - 1) / Math.max(1, plan.step_every_weeks));
  const kg = Math.min(20, item.weight_kg + steps * plan.step_kg);
  return lighter ? Math.max(1, kg - 2) : kg;
}

export const kgText = (kg: number) => (kg === 0 ? "Körpergewicht" : `${kg} kg`);

// ---------- Klettern (Fontainebleau)

export const GRADES = ["4", "4+", "5", "5+", "6A", "6A+", "6B"];
export const GOAL_GRADE = "6A";
export type Climb = { id: string; day: string; grade: string; result: "flash" | "top" | "versuch" };
