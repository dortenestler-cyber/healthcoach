// Health Coach · Edge Function "watch"
// Schnittstelle für die Uhr-App auf der Fenix. Die Uhr meldet sich mit ihrem Uhr-Schlüssel an
// (Authorization: Bearer hcw_…), nicht mit dem Passwort. Gespeichert ist nur der Hash des Schlüssels.
// Diese Funktion wird ohne Supabase-Login-Prüfung hochgeladen (--no-verify-jwt) und prüft den Schlüssel selbst.
//
// Aktionen (POST, JSON): today, flash, intake, checkin, kbsets

import { createClient } from "jsr:@supabase/supabase-js@2";

const TZ = "Europe/Berlin";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const localDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // JJJJ-MM-TT
const localTime = (d = new Date()) => new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

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

const SPORT_LABEL: Record<string, string> = { karate: "KARATE", kettlebell: "KETTLEBELL", klettern: "BOULDERN", ausdauer: "AUSDAUER", sonstiges: "TRAINING" };

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Nur POST" });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token.startsWith("hcw_")) return json(401, { error: "Uhr-Schlüssel fehlt" });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), { auth: { persistSession: false } });
    const { data: tok } = await sb.from("watch_tokens").select("id, user_id").eq("token_hash", await sha256(token)).maybeSingle();
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

    return json(200, await today(sb, uid, day));
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});

// Alles, was die Uhr für heute braucht, kompakt und in Großbuchstaben für das Datenraster
async function today(sb: Any, uid: string, day: string) {
  const [meds, intakes, flashes, checkin, plan, illness, injuries, daily, kbPlan, diary] = await Promise.all([
    sb.from("medications").select("id, name, kind, regular, as_needed, times, notes_key").eq("user_id", uid).eq("active", true).order("created_at"),
    sb.from("medication_intakes").select("medication_id, as_needed, slot, day, at").eq("user_id", uid).gte("day", addDays(day, -6)),
    sb.from("hot_flashes").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("at", new Date(Date.now() - 864e5).toISOString()),
    sb.from("checkins").select("energy").eq("user_id", uid).eq("day", day).maybeSingle(),
    sb.from("planned_sessions").select("sport, time, status").eq("user_id", uid).eq("day", day).neq("status", "ausgelassen"),
    sb.from("illnesses").select("label, severity, fever, below_neck").eq("user_id", uid).is("ended_on", null).limit(1),
    sb.from("injuries").select("spot").eq("user_id", uid).is("ended_on", null),
    sb.from("garmin_daily").select("bb_max, hrv_last_night, sleep_score").eq("user_id", uid).eq("day", day).maybeSingle(),
    sb.from("kb_plans").select("id, name, weeks, step_kg, step_every_weeks, start_date").eq("user_id", uid).eq("active", true).order("created_at", { ascending: false }).limit(1),
    sb.from("diary_entries").select("day, bleeding").eq("user_id", uid).gte("day", addDays(day, -60)).order("day"),
  ]);

  const ins = (intakes.data ?? []) as Any[];
  const todayIns = ins.filter((i) => i.day === day);
  const medList = (meds.data ?? []) as Any[];

  // Regelmäßige Einnahmen: Medikamente einzeln, Supplements je Uhrzeit gebündelt
  const slots: Any[] = [];
  for (const m of medList.filter((x) => x.regular && x.kind === "medikament")) {
    for (const t of m.times?.length ? m.times : ["TÄGLICH"]) {
      slots.push({ label: String(m.name).replace(" Easyhaler", "").toUpperCase(), slot: t, ids: [m.id], bufori: m.notes_key === "bufori", done: todayIns.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t) });
    }
  }
  const supp = new Map<string, Any[]>();
  for (const m of medList.filter((x) => x.regular && x.kind === "supplement")) for (const t of m.times?.length ? m.times : ["TÄGLICH"]) supp.set(t, [...(supp.get(t) ?? []), m]);
  for (const [t, list] of supp) slots.push({ label: "SUPPLEMENTS", slot: t, ids: list.map((m: Any) => m.id), bufori: false, done: list.every((m: Any) => todayIns.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t)) });
  slots.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));

  const needed = medList.filter((m) => m.as_needed).map((m) => ({
    id: m.id,
    label: String(m.name).replace(" Easyhaler", "").toUpperCase(),
    today: todayIns.filter((i) => i.medication_id === m.id && i.as_needed).length,
    week: ins.filter((i) => i.medication_id === m.id && i.as_needed).length,
    bufori: m.notes_key === "bufori",
  }));

  // Kettlebell: Zielgewichte dieser Woche wie in der App
  let kb: Any = null;
  const p = ((kbPlan.data ?? []) as Any[])[0];
  if (p) {
    const { data: items } = await sb.from("kb_plan_items").select("exercise, sets, reps, weight_kg, per_side").eq("plan_id", p.id).order("pos");
    const days = Math.floor((new Date(day).getTime() - new Date(p.start_date).getTime()) / 864e5);
    const week = Math.max(1, Math.min(p.weeks, Math.floor(days / 7) + 1));
    const steps = Math.floor((week - 1) / Math.max(1, p.step_every_weeks));
    kb = {
      plan_id: p.id,
      name: String(p.name).toUpperCase(),
      week,
      items: ((items ?? []) as Any[]).map((it) => ({
        exercise: it.exercise,
        label: String(it.exercise).toUpperCase(),
        sets: it.sets,
        reps: it.reps,
        kg: it.weight_kg === 0 ? 0 : Math.min(20, it.weight_kg + steps * p.step_kg),
        per_side: it.per_side,
      })),
    };
  }

  // Zyklustag aus dem Tagebuch: letzter Beginn mit mindestens leichter Blutung
  const di = (diary.data ?? []) as Any[];
  const any = new Set(di.filter((d) => d.bleeding >= 1).map((d) => d.day));
  const starts = di.filter((d) => d.bleeding >= 2 && !any.has(addDays(d.day, -1)) && !any.has(addDays(d.day, -2))).map((d) => d.day);
  const last = starts[starts.length - 1];
  const cycleDay = last ? Math.round((new Date(day).getTime() - new Date(last).getTime()) / 864e5) + 1 : null;

  const ill = ((illness.data ?? []) as Any[])[0] ?? null;
  const pause = !!ill && (ill.fever || ill.below_neck || ill.severity >= 4);
  const blockedClimb = ((injuries.data ?? []) as Any[]).some((i) => ["finger", "hand", "schulter", "fuss"].includes(i.spot));
  const g = (daily.data ?? null) as Any;

  return {
    day,
    time: localTime(),
    flashes24h: flashes.count ?? 0,
    checkinDone: !!checkin.data,
    cycleDay,
    bb: g?.bb_max ?? null,
    hrv: g?.hrv_last_night ?? null,
    sleep: g?.sleep_score ?? null,
    illness: ill ? String(ill.label).toUpperCase() : null,
    pause,
    plan: ((plan.data ?? []) as Any[]).map((s) => ({
      label: SPORT_LABEL[s.sport] ?? "TRAINING",
      time: s.time ?? "",
      done: s.status === "erledigt",
      note: pause ? "PAUSE" : s.sport === "klettern" && blockedClimb ? "PAUSIERT" : "",
    })),
    slots,
    needed,
    kb,
  };
}
