"use client";

import { supabase } from "@/lib/supabase";

// Sicherung aller eigenen Daten als JSON und einzelne Tabellen als CSV.
// Durch Row Level Security liest und schreibt das immer nur das eigene Konto.
// Schlüssel der Uhr (watch_tokens) werden bewusst nicht gesichert.

export const TABLES: { name: string; label: string; key: string }[] = [
  { name: "settings", label: "Einstellungen", key: "user_id" },
  { name: "diary_entries", label: "Tagebuch", key: "user_id,day" },
  { name: "checkins", label: "Check-ins", key: "user_id,day" },
  { name: "hot_flashes", label: "Hitzewallungen", key: "id" },
  { name: "garmin_daily", label: "Garmin Tageswerte", key: "user_id,day" },
  { name: "garmin_activities", label: "Garmin Aktivitäten", key: "user_id,activity_id" },
  { name: "medications", label: "Medikamente", key: "id" },
  { name: "medication_intakes", label: "Einnahmen", key: "id" },
  { name: "illnesses", label: "Krankheiten", key: "id" },
  { name: "injuries", label: "Verletzungen", key: "id" },
  { name: "injury_pain", label: "Schmerz bei Verletzungen", key: "injury_id,day" },
  { name: "body_measurements", label: "Körper", key: "user_id,day" },
  { name: "planned_sessions", label: "Trainingsplan", key: "user_id,day,sport,source" },
  { name: "kb_plans", label: "Kettlebell-Pläne", key: "id" },
  { name: "kb_plan_items", label: "Kettlebell-Übungen im Plan", key: "id" },
  { name: "kb_sets", label: "Kettlebell-Sätze", key: "id" },
  { name: "climbs", label: "Bouldern", key: "id" },
  { name: "karate_items", label: "Karate", key: "id" },
  { name: "coach_messages", label: "Coach-Verlauf", key: "id" },
];

type Row = Record<string, unknown>;
export type Backup = { app: "Health Coach"; version: 1; created_at: string; tables: Record<string, Row[]> };

async function readAll(name: string): Promise<Row[]> {
  const sb = supabase();
  if (!sb) throw new Error("Nicht verbunden");
  const out: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(name).select("*").range(from, from + page - 1);
    if (error) throw new Error(`${name}: ${error.message}`);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function makeBackup(onStep?: (label: string) => void): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const t of TABLES) {
    onStep?.(t.label);
    tables[t.name] = await readAll(t.name);
  }
  return { app: "Health Coach", version: 1, created_at: new Date().toISOString(), tables };
}

export function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Semikolon als Trenner, damit Excel und Numbers mit deutscher Einstellung es direkt öffnen
export function toCsv(rows: Row[]): string {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== "user_id");
  const lines = [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))];
  return "﻿" + lines.join("\r\n");
}

export async function tableCsv(name: string): Promise<{ csv: string; count: number }> {
  const rows = await readAll(name);
  return { csv: toCsv(rows), count: rows.length };
}

// Spielt eine Sicherung ein. Vorhandene Einträge mit gleichem Schlüssel werden überschrieben,
// nichts wird gelöscht. Die Reihenfolge von TABLES beachtet Verweise (z. B. Plan vor Übung).
export async function restoreBackup(b: Backup, onStep?: (label: string) => void): Promise<number> {
  const sb = supabase();
  if (!sb) throw new Error("Nicht verbunden");
  if (b?.app !== "Health Coach" || !b.tables) throw new Error("Das ist keine Sicherung von Health Coach.");
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Nicht angemeldet");
  let total = 0;
  for (const t of TABLES) {
    const rows = (b.tables[t.name] ?? []).map((r) => ({ ...r, user_id: uid }));
    if (!rows.length) continue;
    onStep?.(t.label);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from(t.name).upsert(rows.slice(i, i + 500), { onConflict: t.key });
      if (error) throw new Error(`${t.label}: ${error.message}`);
    }
    total += rows.length;
  }
  return total;
}
