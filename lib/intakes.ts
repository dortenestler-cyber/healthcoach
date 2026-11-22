// Einnahmen abhaken: einzeln, je Uhrzeit-Gruppe oder alles auf einmal, für heute und für vergangene Tage.
// Mengen trägt die Nutzerin selbst unter Gesundheit ein, die App schlägt keine Dosis vor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isoDay } from "@/lib/dates";
import type { Intake, Medication } from "@/lib/health";

export type Item = { key: string; med: Medication; slot: string; done: boolean; intakeIds: string[] };
export type Group = { key: string; title: string; slot: string; items: Item[]; bundled: boolean };

const slotsOf = (m: Medication) => (m.times.length ? m.times : ["täglich"]);
export const slotLabel = (slot: string) => (slot === "täglich" ? "täglich" : slot);
export const shortName = (name: string) => name.replace(" Easyhaler", "");

// Regelmäßige Einnahmen eines Tages: Medikamente als eigene Zeilen, Supplements je Uhrzeit gruppiert (jedes einzeln abhakbar)
export function groupsFor(meds: Medication[], intakes: Intake[]): Group[] {
  const item = (m: Medication, slot: string): Item => {
    const ids = intakes.filter((i) => i.medication_id === m.id && !i.as_needed && i.slot === slot).map((i) => i.id);
    return { key: m.id + slot, med: m, slot, done: ids.length > 0, intakeIds: ids };
  };
  const groups: Group[] = [];
  for (const m of meds.filter((x) => x.active && x.regular && x.kind === "medikament")) {
    for (const s of slotsOf(m)) groups.push({ key: "m" + m.id + s, title: shortName(m.name), slot: s, items: [item(m, s)], bundled: false });
  }
  const bySlot = new Map<string, Medication[]>();
  for (const m of meds.filter((x) => x.active && x.regular && x.kind === "supplement")) {
    for (const s of slotsOf(m)) bySlot.set(s, [...(bySlot.get(s) ?? []), m]);
  }
  for (const [s, list] of bySlot) groups.push({ key: "s" + s, title: "Supplements", slot: s, items: list.map((m) => item(m, s)), bundled: true });
  return groups.sort((a, b) => a.slot.localeCompare(b.slot) || a.title.localeCompare(b.title));
}

// Zeitpunkt der Einnahme: heute jetzt, an vergangenen Tagen zur geplanten Uhrzeit (sonst 12:00)
export function atFor(day: string, slot: string | null): string {
  if (day === isoDay()) return new Date().toISOString();
  const [h, m] = slot && /^\d{1,2}:\d{2}$/.test(slot) ? slot.split(":").map(Number) : [12, 0];
  const d = new Date(day + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// Abhaken: alle übergebenen, noch offenen Einnahmen eintragen
export async function check(sb: SupabaseClient, day: string, items: Item[]): Promise<string | null> {
  const rows = items.filter((i) => !i.done).map((i) => ({ medication_id: i.med.id, slot: i.slot, day, as_needed: false, at: atFor(day, i.slot) }));
  if (!rows.length) return null;
  const { error } = await sb.from("medication_intakes").insert(rows);
  return error ? error.message : null;
}

// Zurücknehmen: die Einträge der übergebenen Einnahmen löschen
export async function uncheck(sb: SupabaseClient, items: Item[]): Promise<string | null> {
  const ids = items.flatMap((i) => i.intakeIds);
  if (!ids.length) return null;
  const { error } = await sb.from("medication_intakes").delete().in("id", ids);
  return error ? error.message : null;
}

// Bedarfs-Einnahme (Hub) eintragen, an vergangenen Tagen um 12:00
export async function addAsNeeded(sb: SupabaseClient, day: string, med: Medication): Promise<string | null> {
  const { error } = await sb.from("medication_intakes").insert({ medication_id: med.id, as_needed: true, day, at: atFor(day, null) });
  return error ? error.message : null;
}
