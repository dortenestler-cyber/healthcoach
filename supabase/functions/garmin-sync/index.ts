// Health Coach · Edge Function "garmin-sync"
// Holt Tageswerte und Aktivitäten über die Garmin Connect Personal API
// und speichert sie für die angemeldete Nutzerin.
//
// Benötigte Secrets in Supabase (Edge Functions → Secrets):
//   GARMIN_API_KEY   persönlicher API-Schlüssel aus Garmin Connect
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Zwei Wege:
//   App:        supabase.functions.invoke("garmin-sync", { body: { days: 7, offset: 0 } })
//   Morgen-Abruf: der Zeitplan in der Datenbank schickt den Kopf "x-cron-key" mit.
//                 Der Schlüssel liegt im Vault und wird über garmin_cron_key_ok geprüft.

import { createClient } from "jsr:@supabase/supabase-js@2";

const GARMIN = "https://personal.connectapi.garmin.com";
const WINDOW_DAYS = 28; // Garmin erlaubt höchstens 28 Tage pro Abfrage
const MAX_DAYS = 365;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
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

    const url = Deno.env.get("SUPABASE_URL")!;
    const cronKey = req.headers.get("x-cron-key");
    // deno-lint-ignore no-explicit-any
    let sb: any;
    let userId: string;
    let fromCron = false;

    if (cronKey) {
      // Morgen-Abruf aus dem Zeitplan: Schlüssel prüfen, dann für das eine Konto der App abrufen
      sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      const { data: ok, error: keyError } = await sb.rpc("garmin_cron_key_ok", { k: cronKey });
      if (keyError || ok !== true) return json(401, { error: "Schlüssel für den Morgen-Abruf ungültig." });
      const { data: users, error: usersError } = await sb.auth.admin.listUsers({ page: 1, perPage: 2 });
      if (usersError) return json(500, { error: "Konto nicht gefunden: " + usersError.message });
      if (users.users.length !== 1) return json(500, { error: "Der Morgen-Abruf erwartet genau ein Konto." });
      userId = users.users[0].id;
      fromCron = true;
    } else {
      // Mit dem Login der Nutzerin arbeiten: der Zugriffsschutz pro Konto gilt auch hier
      const authHeader = req.headers.get("Authorization") ?? "";
      sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
      if (userError || !userData.user) return json(401, { error: "Nicht angemeldet." });
      userId = userData.user.id;
    }

    // Ergebnis des Morgen-Abrufs festhalten, damit die App einen Fehler anzeigen kann
    const logRun = async (ok: boolean, message: string | null) => {
      if (!fromCron) return;
      await sb.from("garmin_sync_runs").insert({ user_id: userId, ok, message });
    };

    try {
      const result = await syncAll(sb, userId, await req.json().catch(() => ({})), apiKey);
      await logRun(true, null);
      return json(200, result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logRun(false, msg).catch(() => {});
      return json(500, { error: msg });
    }
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});

// deno-lint-ignore no-explicit-any
async function syncAll(sb: any, userId: string, body: any, apiKey: string | undefined) {
  if (!apiKey) throw new Error("GARMIN_API_KEY fehlt in den Supabase-Secrets.");
  {
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

    // Zyklus: ohne Zyklus-Tracking in Garmin bleibt es still beim Tagebuch
    let cycles = 0;
    let cycleNote: string | null = null;
    try {
      // Beim ersten Mal ein halbes Jahr zurück, danach reicht der Zeitraum plus ein Zyklus
      const { count } = await sb.from("garmin_cycles").select("start_date", { count: "exact", head: true }).eq("user_id", userId);
      const back = count ? days + 40 : 180;
      const list = await garminCycles(token, isoDay(addDays(today, -(back - 1))), isoDay(today));
      if (list.length) {
        const { error } = await sb
          .from("garmin_cycles")
          .upsert(list.map((c) => ({ user_id: userId, ...c, synced_at: new Date().toISOString() })), { onConflict: "user_id,start_date" });
        if (error) throw new Error(error.message);
      }
      cycles = list.length;
    } catch (e) {
      cycleNote = "Zyklus nicht abgerufen: " + (e instanceof Error ? e.message : String(e));
    }

    return { ok: true, days, dailyRows: dailyRows.length, activities: activities.length, cycles, cycleNote, syncedAt: new Date().toISOString() };
  }
}

// Zyklusbeginne aus Garmin: Tagesansicht von heute holen, dann jeweils den Tag vor dem
// Zyklusbeginn, bis der Zeitraum abgedeckt ist. So reichen wenige Abfragen pro Zyklus.
async function garminCycles(token: string, fromDay: string, toDay: string): Promise<{ start_date: string; period_length: number | null }[]> {
  const out = new Map<string, number | null>();
  let day = toDay;
  for (let i = 0; i < 16; i++) {
    const res = await garminGet(token, `/periodichealth-service/menstrualcycle/dayview/${day}`);
    const item = Array.isArray(res) ? res[0] : res;
    const sum = item?.daySummary ?? item?.body?.daySummary ?? null;
    const start = typeof sum?.startDate === "string" ? sum.startDate.slice(0, 10) : null;
    if (!start || start > toDay || out.has(start)) break;
    out.set(start, int(sum?.periodLength));
    if (start <= fromDay) break;
    day = isoDay(addDays(new Date(start + "T12:00:00Z"), -1));
  }
  return [...out].map(([start_date, period_length]) => ({ start_date, period_length }));
}
