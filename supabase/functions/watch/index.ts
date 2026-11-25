// Health Coach · Edge Function "watch"
// Schnittstelle für die Uhr-App auf der Fenix. Die Uhr meldet sich mit ihrem Uhr-Schlüssel an
// (Authorization: Bearer hcw_…), nicht mit dem Passwort. Gespeichert ist nur der Hash des Schlüssels.
// Diese Funktion wird ohne Supabase-Login-Prüfung hochgeladen (--no-verify-jwt) und prüft den Schlüssel selbst.
//
// Aktionen (POST, JSON): today, flash, intake, checkin, kbsets

import { createClient } from "jsr:@supabase/supabase-js@2";
import { today } from "./today.ts";

const TZ = "Europe/Berlin";
// CORS, damit die Web-App die Verbindung testen kann
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => {
  // Fehler zusätzlich ins Protokoll schreiben, damit sie in Supabase unter Logs sichtbar sind
  if (status >= 400) console.error(`watch ${status}: ${JSON.stringify(body)}`);
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
};

const localDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // JJJJ-MM-TT

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return "";
  }
}

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json(405, { error: "Nur POST" });
    // Leerzeichen und Zeilenumbrüche entfernen, Präfix unabhängig von Groß- und Kleinschreibung
    let token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
    if (!/^hcw_/i.test(token)) return json(401, { error: "Uhr-Schlüssel fehlt" });
    token = "hcw_" + token.slice(4);
    // Neue Schlüssel bestehen nur aus Kleinbuchstaben und Ziffern
    if (/^hcw_[0-9a-f]+$/i.test(token)) token = token.toLowerCase();

    const key = serviceKey();
    if (!key) return json(500, { error: "Server: Dienstschlüssel fehlt" });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false } });
    const { data: tok, error: tokErr } = await sb.from("watch_tokens").select("id, user_id").eq("token_hash", await sha256(token)).maybeSingle();
    if (tokErr) return json(500, { error: "Server: " + tokErr.message });
    if (!tok) return json(401, { error: "Uhr-Schlüssel ungültig" });
    const uid = (tok as Any).user_id as string;
    await sb.from("watch_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", (tok as Any).id);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "today");
    const day = localDay();
    const now = new Date().toISOString();

    if (action === "flash") {
      const { error } = await sb.from("hot_flashes").insert({ user_id: uid, at: now, source: "uhr" });
      if (error) return json(500, { error: error.message });
    } else if (action === "intake") {
      const asNeeded = !!body?.as_needed;
      const slot = body?.slot ? String(body.slot) : null;
      const ids: string[] = (Array.isArray(body?.medication_ids) ? body.medication_ids : [body?.medication_id]).map(String).slice(0, 10);
      // Gehören die Mittel der Nutzerin?
      const { data: owned } = await sb.from("medications").select("id").eq("user_id", uid).in("id", ids);
      if (!ids.length || (owned ?? []).length !== ids.length) return json(404, { error: "Mittel nicht gefunden" });
      const rows = ids.map((id) => ({ user_id: uid, medication_id: id, as_needed: asNeeded, slot: asNeeded ? null : slot, day, at: now, source: "uhr" }));
      const { error } = await sb.from("medication_intakes").insert(rows);
      if (error) return json(500, { error: error.message });
    } else if (action === "checkin") {
      const v = (x: unknown) => (typeof x === "number" && x >= 1 && x <= 3 ? Math.round(x) : null);
      const { error } = await sb
        .from("checkins")
        .upsert({ user_id: uid, day, energy: v(body?.energy), sleep: v(body?.sleep), mood: v(body?.mood), source: "uhr", updated_at: now }, { onConflict: "user_id,day" });
      if (error) return json(500, { error: error.message });
    } else if (action === "kbsets") {
      const planId = body?.plan_id ? String(body.plan_id) : null;
      const sets = (Array.isArray(body?.sets) ? body.sets : []) as Any[];
      const rows = sets.slice(0, 60).map((s) => ({
        user_id: uid,
        plan_id: planId,
        day,
        exercise: String(s.exercise ?? "").slice(0, 60),
        set_no: Number(s.set_no) || 1,
        reps: Math.max(0, Number(s.reps) || 0),
        weight_kg: Math.max(0, Math.min(20, Number(s.weight_kg) || 0)),
        target_reps: Number(s.target_reps) || null,
        target_kg: Number.isFinite(Number(s.target_kg)) ? Number(s.target_kg) : null,
      }));
      if (rows.length) {
        const { error } = await sb.from("kb_sets").insert(rows);
        if (error) return json(500, { error: error.message });
        await sb.from("planned_sessions").update({ status: "erledigt" }).eq("user_id", uid).eq("day", day).eq("sport", "kettlebell");
      }
    } else if (action !== "today") {
      return json(400, { error: "Unbekannte Aktion" });
    }

    try {
      const t = await today(sb, uid, day);
      // Kurzform für das Zifferblatt: der Hintergrundspeicher auf der Uhr ist klein
      if (body?.compact) {
        const next = (t.plan as Any[]).find((p) => !p.done) ?? (t.plan as Any[])[0] ?? null;
        const hubs = (t.needed as Any[]).reduce((s, n) => s + (n.today ?? 0), 0);
        const open = (t.slots as Any[]).filter((s) => !s.done).length;
        return json(200, {
          time: t.time,
          cycleDay: t.cycleDay,
          pause: t.pause,
          sick: t.illness !== null,
          hubs,
          open,
          flashes: t.flashes24h,
          next: next ? { label: next.label, time: next.time, done: next.done, note: next.note } : null,
          // Zusatzwerte für wählbare Felder auf dem Zifferblatt
          goal: t.goal,
          phase: t.phase,
          hrv: t.hrv,
          sleep: t.sleep,
          fa: t.fitnessAge,
          rhr: t.rhr,
        });
      }
      return json(200, t);
    } catch (e) {
      return json(500, { error: "Übersicht: " + (e instanceof Error ? e.message : String(e)) });
    }
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
