// Health Coach · Edge Function "garmin-sync"
// Holt Tageswerte und Aktivitäten über die Garmin Connect Personal API
// und speichert sie für die angemeldete Nutzerin.
//
// Benötigte Secrets in Supabase (Edge Functions → Secrets):
//   GARMIN_API_KEY   persönlicher API-Schlüssel aus Garmin Connect
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY
//
// Aufruf aus der App: supabase.functions.invoke("garmin-sync", { body: { days: 7, offset: 0 } })

import { createClient } from "jsr:@supabase/supabase-js@2";

const GARMIN = "https://personal.connectapi.garmin.com";
const WINDOW_DAYS = 28; // Garmin erlaubt höchstens 28 Tage pro Abfrage
const MAX_DAYS = 365;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// deno-lint-ignore no-explicit-any
type Any = any;

async function garminToken(apiKey: string): Promise<string> {
  const res = await fetch(`${GARMIN}/personalapitoken-service/personal-api/personal-api-key/token`, {
    method: "POST",
    headers: { Authorization: `ApiKey ${apiKey}`, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`Garmin-Schlüssel abgelehnt (${res.status}). Ist er abgelaufen?`);
  const text = (await res.text()).trim();
  // Die Antwort ist der Token als Text; zur Sicherheit auch JSON-Varianten abfangen
  if (text.startsWith("{")) {
    const j = JSON.parse(text);
    return j.access_token ?? j.accessToken ?? j.token;
  }
  return text.replace(/^"|"$/g, "");
}

async function garminGet(token: string, path: string): Promise<Any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${GARMIN}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (res.status === 204) return null;
    if (res.status === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Garmin ${path.split("?")[0]} antwortet mit ${res.status}`);
    return await res.json();
  }
  throw new Error("Garmin hat zu viele Anfragen gemeldet. Bitte später noch einmal.");
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const apiKey = Deno.env.get("GARMIN_API_KEY");
    if (!apiKey) return json(500, { error: "GARMIN_API_KEY fehlt in den Supabase-Secrets." });

    // Mit dem Login der Nutzerin arbeiten: der Zugriffsschutz pro Konto gilt auch hier
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return json(401, { error: "Nicht angemeldet." });
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const days = Math.min(MAX_DAYS, Math.max(1, Number(body?.days) || 7));
    // offset: wie viele Tage vor heute der Zeitraum endet (für das Nachladen älterer Daten in Stücken)
    const offset = Math.min(MAX_DAYS, Math.max(0, Number(body?.offset) || 0));

    const token = await garminToken(apiKey);
    const today = addDays(new Date(), -offset);
    const from = addDays(today, -(days - 1));

    // Zeitraum in Fenster von höchstens 28 Tagen teilen
    const windows: { s: string; e: string }[] = [];
    for (let start = from; start <= today; start = addDays(start, WINDOW_DAYS)) {
      const end = addDays(start, WINDOW_DAYS - 1) > today ? today : addDays(start, WINDOW_DAYS - 1);
      windows.push({ s: isoDay(start), e: isoDay(end) });
    }

    const daily = new Map<string, Record<string, unknown>>();
    const row = (day: string) => {
      if (!daily.has(day)) daily.set(day, { user_id: userId, day, synced_at: new Date().toISOString() });
      return daily.get(day)!;
    };
    const activities: Record<string, unknown>[] = [];

    for (const w of windows) {
      // Tageszusammenfassung: Ruhepuls, Stress, Body Battery, Schritte, Intensität
      const sums = await garminGet(token, `/usersummary-service/v2/dailysummaries?startDate=${w.s}&endDate=${w.e}`);
      for (const d of (sums?.data ?? sums ?? []) as Any[]) {
        const day = d?.calendarDate;
        if (!day) continue;
        const r = row(day);
        r.resting_hr = int(d?.heartRate?.restingValue);
        r.stress_avg = int(d?.stress?.avgLevel);
        r.bb_max = int(d?.bodyBattery?.maxValue);
        r.bb_min = int(d?.bodyBattery?.minValue);
        r.bb_charged = int(d?.bodyBattery?.chargedValue);
        r.bb_drained = int(d?.bodyBattery?.drainedValue);
        r.steps = int(d?.movement?.steps?.value);
        const im = d?.intensityMinutes ?? {};
        const mod = num(im?.moderate?.value ?? im?.moderateValue ?? im?.moderate) ?? 0;
        const vig = num(im?.vigorous?.value ?? im?.vigorousValue ?? im?.vigorous) ?? 0;
        r.intensity_minutes = mod || vig ? Math.round(mod + 2 * vig) : null;
      }

      // Schlaf
      const sleeps = await garminGet(token, `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${w.s}&endDate=${w.e}`);
      for (const s of (Array.isArray(sleeps) ? sleeps : sleeps?.data ?? []) as Any[]) {
        const day = s?.calendarDate ?? s?.sleepDate ?? s?.date;
        if (!day) continue;
        const r = row(day);
        r.sleep_seconds = int(s?.sleepTimeSeconds);
        r.sleep_score = int(s?.sleepScores?.overall?.value);
      }

      // HRV
      const hrv = await garminGet(token, `/hrv-service/hrv/daily/${w.s}/${w.e}`);
      for (const h of (hrv?.hrvSummaries ?? []) as Any[]) {
        const day = h?.calendarDate;
        if (!day) continue;
        const r = row(day);
        r.hrv_last_night = int(h?.lastNightAvg);
        r.hrv_weekly_avg = int(h?.weeklyAvg);
        r.hrv_status = typeof h?.status === "string" ? h.status : null;
      }

      // Aktivitäten, in Seiten zu 20
      for (let start = 0; start < 400; start += 20) {
        const list = await garminGet(
          token,
          `/activitylist-service/activities/search/activities?startDate=${w.s}&endDate=${w.e}&start=${start}&limit=20&sortOrder=desc&excludeChildren=true`,
        );
        const items = (Array.isArray(list) ? list : []) as Any[];
        for (const a of items) {
          if (!a?.activityId) continue;
          activities.push({
            user_id: userId,
            activity_id: a.activityId,
            type_key: a?.activityType?.typeKey ?? null,
            name: a?.activityName ?? null,
            start_local: a?.startTimeLocal ?? null,
            duration_s: int(a?.duration),
            distance_m: num(a?.distance),
            avg_hr: int(a?.averageHR),
            max_hr: int(a?.maxHR),
            training_load: num(a?.activityTrainingLoad),
            synced_at: new Date().toISOString(),
          });
        }
        if (items.length < 20) break;
      }
    }

    const dailyRows = [...daily.values()];
    if (dailyRows.length) {
      const { error } = await sb.from("garmin_daily").upsert(dailyRows, { onConflict: "user_id,day" });
      if (error) throw new Error("Speichern der Tageswerte: " + error.message);
    }
    if (activities.length) {
      const { error } = await sb.from("garmin_activities").upsert(activities, { onConflict: "user_id,activity_id" });
      if (error) throw new Error("Speichern der Aktivitäten: " + error.message);
    }

    return json(200, { ok: true, days, dailyRows: dailyRows.length, activities: activities.length, syncedAt: new Date().toISOString() });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
