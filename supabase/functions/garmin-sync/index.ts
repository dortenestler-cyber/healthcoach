// Health Coach · Edge Function "garmin-sync"
// Holt Tageswerte und Aktivitäten über die Garmin Connect Personal API
// und speichert sie für die angemeldete Nutzerin.
//
// Benötigte Secrets in Supabase (Edge Functions → Secrets):
//   GARMIN_API_KEY   persönlicher API-Schlüssel aus Garmin Connect
//   GARMIN_API_KEY_EXPIRES  optional, Ablaufdatum des Schlüssels als JJJJ-MM-TT (für die Warnung in der App)
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, Server-Schlüssel (für den Morgen-Abruf)
//
// Zwei Wege:
//   App:          supabase.functions.invoke("garmin-sync", { body: { days: 7, offset: 0 } })
//   Morgen-Abruf: der Zeitplan in der Datenbank schickt den Kopf "x-cron-key" mit.
//                 Der Schlüssel liegt im Vault und wird über garmin_cron_key_ok geprüft.
// Die Funktion läuft ohne JWT-Prüfung am Eingang (siehe Workflow), weil sie Login oder Schlüssel selbst prüft.

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

// Hauttemperatur: Garmin dokumentiert den Feldnamen der Personal API nicht.
// Deshalb bekannte Namen zuerst, danach jedes Feld, das nach Hauttemperatur-Abweichung klingt.
// Werte in Fahrenheit werden in °C umgerechnet. Plausibel sind Abweichungen bis ±5 °C.
const SKIN_KEYS_C = ["avgSkinTempDeviationC", "avgSkinTempDeviationCelsius", "skinTempDeviationC", "avgSkinTemperatureDeviationC", "skinTempDeltaC"];
const SKIN_KEYS_F = ["avgSkinTempDeviationF", "avgSkinTempDeviationFahrenheit", "skinTempDeviationF"];
function findSkinTemp(obj: Any, depth = 0): { value: number; key: string } | null {
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  for (const k of SKIN_KEYS_C) if (typeof obj[k] === "number") return { value: obj[k], key: k };
  for (const k of SKIN_KEYS_F) if (typeof obj[k] === "number") return { value: obj[k] / 1.8, key: k };
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && /skin.?temp/i.test(k) && /dev|delta|change|diff/i.test(k)) {
      return { value: /F$|fahrenheit/i.test(k) ? v / 1.8 : v, key: k };
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const f = findSkinTemp(v, depth + 1);
      if (f) return f;
    }
  }
  return null;
}
const plausibleTemp = (v: number) => Number.isFinite(v) && Math.abs(v) <= 5;
// Nur für die Fehlersuche: Feldnamen mit „temp“ aus einer Schlafantwort
function tempKeys(obj: Any, prefix = "", depth = 0, out: string[] = []): string[] {
  if (!obj || typeof obj !== "object" || depth > 3) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (/temp/i.test(k)) out.push(prefix + k);
    if (v && typeof v === "object" && !Array.isArray(v)) tempKeys(v, prefix + k + ".", depth + 1, out);
  }
  return out.slice(0, 10);
}

// Ortszeit für den Tagesverlauf: Minuten seit Mitternacht in Europe/Berlin
const TZ = "Europe/Berlin";
const localParts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function localDayMinute(ms: number): { day: string; minute: number } {
  const p = Object.fromEntries(localParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
}
// Garmin liefert lokale Zeitstempel als Millisekunden „wie UTC“: Minuten seit Mitternacht direkt ablesen
const localStampMinute = (v: unknown): number | null => (typeof v === "number" && v > 1e11 ? new Date(v).getUTCHours() * 60 + new Date(v).getUTCMinutes() : null);

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

// Server-Schlüssel: alter Name oder neues Format (wie in der Funktion push)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Ergebnis des Morgen-Abrufs festhalten, damit die App einen Fehler anzeigen kann
  let logRun = async (_ok: boolean, _message: string | null) => {};

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const cronKey = req.headers.get("x-cron-key");
    let sb: Any;
    let userId: string;

    if (cronKey) {
      // Morgen-Abruf aus dem Zeitplan: Schlüssel prüfen, dann für das eine Konto der App abrufen
      sb = createClient(url, serviceKey(), { auth: { persistSession: false } });
      const { data: ok, error: keyError } = await sb.rpc("garmin_cron_key_ok", { k: cronKey });
      if (keyError || ok !== true) return json(401, { error: "Schlüssel für den Morgen-Abruf ungültig." });
      const { data: users, error: usersError } = await sb.auth.admin.listUsers({ page: 1, perPage: 2 });
      if (usersError) return json(500, { error: "Konto nicht gefunden: " + usersError.message });
      if (users.users.length !== 1) return json(500, { error: "Der Morgen-Abruf erwartet genau ein Konto." });
      userId = users.users[0].id;
      const uid = userId;
      logRun = async (ok: boolean, message: string | null) => {
        await sb.from("garmin_sync_runs").insert({ user_id: uid, ok, message });
      };
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

    const apiKey = Deno.env.get("GARMIN_API_KEY");
    if (!apiKey) throw new Error("GARMIN_API_KEY fehlt in den Supabase-Secrets.");

    const body = await req.json().catch(() => ({}));

    // Einrichtungs-Check: nur prüfen, ob der Schlüssel angenommen wird, nichts abrufen
    if (body?.check) {
      const expires = Deno.env.get("GARMIN_API_KEY_EXPIRES") ?? null;
      try {
        await garminToken(apiKey);
        return json(200, { ok: true, expires });
      } catch (e) {
        return json(200, { ok: false, expires, error: e instanceof Error ? e.message : String(e) });
      }
    }

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
    const skinKeys = new Set<string>();
    let bbCurveDays = 0;
    let bbNote = "";
    let sleepTempKeys: string[] = [];

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
        // Schlafphasen in Sekunden; fehlen sie in der Antwort, bleiben sie leer
        r.sleep_deep_s = int(s?.deepSleepSeconds ?? s?.deepSleepDurationInSeconds);
        r.sleep_rem_s = int(s?.remSleepSeconds ?? s?.remSleepInSeconds ?? s?.remSleepDurationInSeconds);
        r.sleep_light_s = int(s?.lightSleepSeconds ?? s?.lightSleepDurationInSeconds);
        r.sleep_awake_s = int(s?.awakeSleepSeconds ?? s?.awakeDurationInSeconds);
        r.sleep_start_min = localStampMinute(s?.sleepStartTimestampLocal);
        r.sleep_end_min = localStampMinute(s?.sleepEndTimestampLocal);
        const t = findSkinTemp(s);
        if (t && plausibleTemp(t.value)) {
          r.skin_temp_delta = Math.round(t.value * 100) / 100;
          skinKeys.add(t.key);
        } else if (!sleepTempKeys.length) sleepTempKeys = tempKeys(s);
      }

      // Body Battery im Tagesverlauf (für „Energie über den Tag“). Garmin dokumentiert den Pfad der Personal API nicht;
      // es wird der Pfad aus Garmin Connect versucht. Fehler brechen den Abruf nicht ab.
      try {
        const bb = await garminGet(token, `/wellness-service/wellness/bodyBattery/reports/daily?startDate=${w.s}&endDate=${w.e}`);
        for (const d of (Array.isArray(bb) ? bb : bb?.data ?? []) as Any[]) {
          const values = (d?.bodyBatteryValuesArray ?? []) as Any[];
          const curves = new Map<string, (number | null)[]>();
          for (const v of values) {
            if (!Array.isArray(v) || typeof v[0] !== "number") continue;
            const level = typeof v[1] === "number" ? v[1] : typeof v[2] === "number" ? v[2] : null;
            if (level === null || level < 0 || level > 100) continue;
            const { day, minute } = localDayMinute(v[0]);
            if (!curves.has(day)) curves.set(day, Array(96).fill(null));
            curves.get(day)![Math.floor(minute / 15)] = Math.round(level);
          }
          // Mehrere Einträge können denselben Tag betreffen: ergänzen statt überschreiben
          for (const [day, curve] of curves) {
            if (day < w.s || day > w.e) continue;
            const r = row(day);
            const merged = (Array.isArray(r.bb_curve) ? r.bb_curve : Array(96).fill(null)) as (number | null)[];
            curve.forEach((v, i) => {
              if (v !== null) merged[i] = v;
            });
            r.bb_curve = merged;
          }
          if (curves.size) bbCurveDays += curves.size;
        }
      } catch {
        bbNote = "Body Battery im Tagesverlauf ist bei Garmin nicht abrufbar.";
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

    // Fitness-Alter für das Zifferblatt: nur beim Abruf bis heute, Fehler brechen den Abruf nicht ab.
    // Garmin dokumentiert den Pfad der Personal API nicht; es wird der Pfad aus Garmin Connect versucht.
    if (offset === 0) {
      try {
        const fa = await garminGet(token, `/fitnessage-service/fitnessage/${isoDay(today)}`);
        const v = num(fa?.fitnessAge ?? fa?.currentFitnessAge ?? fa?.fitnessAgeValue);
        if (v !== null && v > 10 && v < 100) row(isoDay(today)).fitness_age = Math.round(v);
      } catch {
        // kein Fitness-Alter verfügbar
      }
    }

    // Fallback: einzelne Nächte der letzten 14 Tage abfragen, wenn die Übersicht keine Hauttemperatur hatte.
    // Fehler hier brechen den Abruf nicht ab.
    let skinNote = "";
    const recent = [...daily.values()].filter((r) => r.skin_temp_delta === undefined && String(r.day) >= isoDay(addDays(today, -13)));
    if (recent.length && !skinKeys.size) {
      const paths = ["/wellness-service/wellness/dailySleepData?date=", "/sleep-service/sleep/dailySleepData?date="];
      let path: string | null = null;
      for (const r of recent.sort((a, b) => String(b.day).localeCompare(String(a.day)))) {
        const candidates: string[] = path ? [path] : paths;
        let found = false;
        for (const p of candidates) {
          try {
            const detail = await garminGet(token, p + r.day);
            path = p;
            found = true;
            const t = findSkinTemp(detail);
            if (t && plausibleTemp(t.value)) {
              r.skin_temp_delta = Math.round(t.value * 100) / 100;
              skinKeys.add(t.key);
            } else if (!sleepTempKeys.length) sleepTempKeys = tempKeys(detail);
            break;
          } catch {
            // nächsten Pfad versuchen
          }
        }
        if (!found) {
          skinNote = "Einzelne Nächte konnten nicht abgefragt werden.";
          break;
        }
      }
    }
    const skinTempNights = [...daily.values()].filter((r) => typeof r.skin_temp_delta === "number").length;

    const dailyRows = [...daily.values()];
    let migrationMissing = false;
    let stagesMissing = false;
    let energyMissing = false;
    if (dailyRows.length) {
      // Spalten aus späteren Migrationen: fehlt eine in der Datenbank, ohne sie speichern,
      // damit der Abruf weiter funktioniert. Die App weist dann auf die fehlende Migration hin.
      const optional: Record<string, string[]> = {
        skin_temp_delta: ["skin_temp_delta"],
        fitness_age: ["fitness_age"],
        sleep_: ["sleep_deep_s", "sleep_rem_s", "sleep_light_s", "sleep_awake_s"],
        energie_: ["bb_curve", "sleep_start_min", "sleep_end_min"],
      };
      const dropped = new Set<string>();
      const strip = () => dailyRows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !dropped.has(k))));
      let { error } = await sb.from("garmin_daily").upsert(dailyRows, { onConflict: "user_id,day" });
      for (let tries = 0; error && tries < 4; tries++) {
        const hit = Object.entries(optional).find(([, cols]) => cols.some((c) => error!.message.includes(c)) && !cols.every((c) => dropped.has(c)));
        if (!hit) break;
        hit[1].forEach((c) => dropped.add(c));
        if (hit[0] === "skin_temp_delta") migrationMissing = true;
        if (hit[0] === "sleep_") stagesMissing = true;
        if (hit[0] === "energie_") energyMissing = true;
        ({ error } = await sb.from("garmin_daily").upsert(strip(), { onConflict: "user_id,day" }));
      }
      if (error) throw new Error("Speichern der Tageswerte: " + error.message);
    }
    if (activities.length) {
      const { error } = await sb.from("garmin_activities").upsert(activities, { onConflict: "user_id,activity_id" });
      if (error) throw new Error("Speichern der Aktivitäten: " + error.message);
    }

    // Zyklus aus Garmin: ohne Zyklus-Tracking in Garmin oder ohne Tabelle bleibt es still beim Tagebuch
    let cycles = 0;
    let cycleNote = "";
    if (offset === 0) {
      try {
        // Beim ersten Mal ein halbes Jahr zurück, danach reicht der Zeitraum plus ein Zyklus
        const { count, error: countError } = await sb.from("garmin_cycles").select("start_date", { count: "exact", head: true }).eq("user_id", userId);
        if (countError) throw new Error(countError.message);
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
        cycleNote = "Zyklus aus Garmin nicht abgerufen: " + (e instanceof Error ? e.message : String(e));
      }
    }

    await logRun(true, null).catch(() => {});
    return json(200, {
      ok: true,
      days,
      cycles,
      cycleNote,
      dailyRows: dailyRows.length,
      activities: activities.length,
      skinTempNights: migrationMissing ? 0 : skinTempNights,
      skinTempKeys: [...skinKeys],
      sleepTempKeys,
      skinNote: migrationMissing ? "Die Datenbank-Spalte für die Hauttemperatur fehlt noch." : skinNote,
      sleepStagesNote: stagesMissing ? "Die Datenbank-Spalten für die Schlafphasen fehlen noch." : "",
      bbCurveDays: energyMissing ? 0 : bbCurveDays,
      energyNote: energyMissing ? "Die Datenbank-Spalten für die Energie über den Tag fehlen noch." : bbNote,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun(false, msg).catch(() => {});
    return json(500, { error: msg });
  }
});

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
