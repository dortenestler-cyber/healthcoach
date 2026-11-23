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
import { actDetailRow, type ActDetail, activityIntervals, computeDay, mergeActDetail, conversionFactor, FACTOR_START, HR_MAX_START, HR_REST_START, LOAD_VERSION, type LoadDay, MIN_COVERAGE, pointsFromSteps, type Sample } from "./alltag.ts";

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
    let bbCurveDays = 0;
    let bbNote = "";
    let stressCurveDays = 0;
    let stressNote = "";
    const stress: StressCache = { known: { path: null, failed: false }, days: new Map() };

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
        // Für die Belastung aus dem Alltag; Garmin benennt die Felder je nach Schnittstelle unterschiedlich
        // Personal API: calories.burnedActive (Zahl oder { value }). Eine aktive Zeit liefert sie nicht.
        const kcal = d?.calories?.burnedActive;
        r.active_kcal = int(typeof kcal === "object" && kcal ? kcal.value : kcal);
        r.active_s = int(d?.movement?.activeSeconds ?? d?.movement?.active?.value ?? d?.activeSeconds);
        r.highly_active_s = int(d?.movement?.highlyActiveSeconds ?? d?.movement?.highlyActive?.value ?? d?.highlyActiveSeconds);
        const im = d?.intensityMinutes ?? {};
        const mod = num(im?.moderate?.value ?? im?.moderateValue ?? im?.moderate) ?? 0;
        const vig = num(im?.vigorous?.value ?? im?.vigorousValue ?? im?.vigorous) ?? 0;
        r.intensity_minutes = mod || vig ? Math.round(mod + 2 * vig) : null;
        // Stress-Aufteilung in Sekunden (Ruhe, niedrig, mittel, hoch) und Atemfrequenz im Schlaf.
        // Garmin benennt die Felder je nach Schnittstelle unterschiedlich; fehlt ein Feld, bleibt es leer.
        const st = d?.stress ?? {};
        r.stress_rest_s = int(st?.restDuration ?? d?.restStressDuration);
        r.stress_low_s = int(st?.lowDuration ?? d?.lowStressDuration);
        r.stress_medium_s = int(st?.mediumDuration ?? d?.mediumStressDuration);
        r.stress_high_s = int(st?.highDuration ?? d?.highStressDuration);
        const resp = num(d?.respiration?.avgSleepValue ?? d?.avgSleepRespirationValue ?? d?.respiration?.avgValue);
        if (resp !== null && resp >= 5 && resp <= 40) r.respiration_avg = Math.round(resp * 10) / 10;
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
        const sResp = num(s?.averageRespirationValue ?? s?.avgSleepRespirationValue ?? s?.respiration?.avgValue);
        if (sResp !== null && sResp >= 5 && sResp <= 40) r.respiration_avg = Math.round(sResp * 10) / 10;
        // Wachphasen (Anzahl) und Sauerstoffsättigung im Schlaf. Eine Zeitachse der Phasen und die
        // Hauttemperatur liefert die Personal API nicht (geprüft 23.11.2026).
        r.awake_count = int(s?.awakeCount);
        const spo2 = num(s?.averageSpO2Value);
        r.spo2_avg = spo2 !== null && spo2 >= 50 && spo2 <= 100 ? Math.round(spo2 * 10) / 10 : null;
        const spo2Low = num(s?.lowestSpO2Value);
        r.spo2_low = spo2Low !== null && spo2Low >= 50 && spo2Low <= 100 ? Math.round(spo2Low) : null;
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

      // Stress im Tagesverlauf (für den Tagesrückblick): ein Abruf pro Tag, daher nur für die letzten 7 Tage.
      // Pfad aus Garmin Connect, nicht dokumentiert. Fehler brechen den Abruf nicht ab.
      for (let day = w.s; day <= w.e; day = isoDay(addDays(new Date(day + "T12:00:00"), 1))) {
        if (day < isoDay(addDays(today, -6))) continue;
        try {
          const values = await stressValues(token, day, stress);
          const curve: (number | null)[] = Array(96).fill(null);
          let any = false;
          for (const v of values) {
            if (!Array.isArray(v) || typeof v[0] !== "number" || typeof v[1] !== "number") continue;
            if (v[1] < 0 || v[1] > 100) continue; // -1/-2: kein Wert oder Bewegung
            const lm = localDayMinute(v[0]);
            if (lm.day !== day) continue;
            const i = Math.floor(lm.minute / 15);
            curve[i] = curve[i] === null ? v[1] : Math.max(curve[i] as number, v[1]);
            any = true;
          }
          if (any) {
            row(day).stress_curve = curve;
            stressCurveDays++;
          }
        } catch {
          stressNote = "Stress im Tagesverlauf ist bei Garmin nicht abrufbar.";
        }
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
            steps: int(a?.steps),
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

    const dailyRows = [...daily.values()];
    let stagesMissing = false;
    let energyMissing = false;
    let stressMissing = false;
    let alltagMissing = false;
    let nightMissing = false;
    if (dailyRows.length) {
      // Spalten aus späteren Migrationen: fehlt eine in der Datenbank, ohne sie speichern,
      // damit der Abruf weiter funktioniert. Die App weist dann auf die fehlende Migration hin.
      const optional: Record<string, string[]> = {
        fitness_age: ["fitness_age"],
        sleep_: ["sleep_deep_s", "sleep_rem_s", "sleep_light_s", "sleep_awake_s"],
        energie_: ["bb_curve", "sleep_start_min", "sleep_end_min"],
        atem_stress_: ["respiration_avg", "stress_rest_s", "stress_low_s", "stress_medium_s", "stress_high_s", "stress_curve"],
        alltag_: ["hr_curve", "load_daily_min", "active_kcal", "active_s", "highly_active_s", "steps_outside_acts"],
        nacht_: ["awake_count", "spo2_avg", "spo2_low"],
      };
      const dropped = new Set<string>();
      const strip = () => dailyRows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !dropped.has(k))));
      let { error } = await sb.from("garmin_daily").upsert(dailyRows, { onConflict: "user_id,day" });
      for (let tries = 0; error && tries < 5; tries++) {
        const hit = Object.entries(optional).find(([, cols]) => cols.some((c) => error!.message.includes(c)) && !cols.every((c) => dropped.has(c)));
        if (!hit) break;
        hit[1].forEach((c) => dropped.add(c));
        if (hit[0] === "sleep_") stagesMissing = true;
        if (hit[0] === "energie_") energyMissing = true;
        if (hit[0] === "atem_stress_") stressMissing = true;
        if (hit[0] === "alltag_") alltagMissing = true;
        if (hit[0] === "nacht_") nightMissing = true;
        ({ error } = await sb.from("garmin_daily").upsert(strip(), { onConflict: "user_id,day" }));
      }
      if (error) throw new Error("Speichern der Tageswerte: " + error.message);
    }
    if (activities.length) {
      let { error } = await sb.from("garmin_activities").upsert(activities, { onConflict: "user_id,activity_id" });
      if (error && /steps/.test(error.message)) {
        // Migration 20261124090000_alltagslast fehlt noch: ohne Schritte speichern
        alltagMissing = true;
        ({ error } = await sb.from("garmin_activities").upsert(activities.map(({ steps: _s, ...a }) => a), { onConflict: "user_id,activity_id" }));
      }
      if (error) throw new Error("Speichern der Aktivitäten: " + error.message);
    }

    // Belastung aus dem Alltag: Tagespuls in Zonen, getrennt nach Training und Alltag.
    // Fehler brechen den Abruf nicht ab.
    let alltagDays = 0;
    let alltagNote = "";
    if (!alltagMissing) {
      try {
        const res = await syncAlltag(sb, token, userId, [...daily.keys()], offset === 0, stress);
        alltagDays = res.days;
        alltagNote = res.note;
      } catch (e) {
        alltagNote = "Belastung aus dem Alltag nicht berechnet: " + (e instanceof Error ? e.message : String(e));
      }
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
      nightNote: nightMissing ? "Die Datenbank-Spalten für Wachphasen und Sauerstoff fehlen noch." : "",
      sleepStagesNote: stagesMissing ? "Die Datenbank-Spalten für die Schlafphasen fehlen noch." : "",
      bbCurveDays: energyMissing ? 0 : bbCurveDays,
      energyNote: energyMissing ? "Die Datenbank-Spalten für die Energie über den Tag fehlen noch." : bbNote,
      stressCurveDays: stressMissing ? 0 : stressCurveDays,
      stressNote: stressMissing ? "Die Datenbank-Spalten für Atemfrequenz und Stress fehlen noch." : stressNote,
      alltagDays,
      alltagNote: alltagMissing ? "Die Datenbank-Spalten für die Belastung aus dem Alltag fehlen noch." : alltagNote,
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

// ---------------------------------------------------------------------------------------------
// Belastung aus dem Alltag (Konzept docs/konzept-korridore-alltagslast.md, Teil B)
// Pro Tag: Tagespuls abrufen, jede Minute einer Pulszone zuordnen, Minuten in Garmin-Aktivitäten
// zählen als Training, alle anderen als Alltag (im Alltag nur mit gemessener Bewegung).
// Die Rohdaten alle 2 Minuten werden nicht gespeichert, nur Zonenminuten und eine Kurve je 15 Minuten.
// Nachberechnung: bei jedem Abruf bis heute zusätzlich bis zu MAX_LOAD_DAYS Tage der letzten 90 Tage,
// die noch keine Werte haben. So sind nach wenigen Abrufen (auch Morgen-Abrufen) alle 90 Tage gefüllt.

const LOAD_BACK_DAYS = 90;
const MAX_LOAD_DAYS = 21;
const HR_PATHS = ["/wellness-service/wellness/dailyHeartRate?date=", "/wellness-service/wellness/dailyHeartRate/"];
// Wie beim Tagespuls zuerst die Form mit ?date= (die funktioniert dort), dann die aus Garmin Connect
const STRESS_PATHS = ["/wellness-service/wellness/dailyStress?date=", "/wellness-service/wellness/dailyStress/"];

type StressCache = { known: { path: string | null; failed: boolean }; days: Map<string, Any[]> };
// Stresswerte eines Tages, je Tag nur ein Abruf. Wirft, wenn Garmin den Stressverlauf gar nicht liefert.
async function stressValues(token: string, day: string, c: StressCache): Promise<Any[]> {
  if (c.days.has(day)) return c.days.get(day)!;
  if (c.known.failed) throw new Error("Stressverlauf nicht abrufbar");
  const sd = await firstPath(token, STRESS_PATHS, day, c.known);
  const values = (sd?.stressValuesArray ?? []) as Any[];
  c.days.set(day, values);
  return values;
}

const shiftDay = (day: string, n: number) => isoDay(addDays(new Date(day + "T12:00:00Z"), n));

async function firstPath(token: string, paths: string[], day: string, known: { path: string | null; failed: boolean }): Promise<Any> {
  if (known.failed) return undefined;
  const candidates = known.path ? [known.path] : paths;
  let lastError: unknown = null;
  for (const p of candidates) {
    try {
      const res = await garminGet(token, p + day);
      known.path = p;
      return res;
    } catch (e) {
      lastError = e;
    }
  }
  if (!known.path) known.failed = true;
  throw lastError ?? new Error("nicht abrufbar");
}

async function syncAlltag(sb: Any, token: string, userId: string, rangeDays: string[], backfill: boolean, stress: StressCache): Promise<{ days: number; note: string }> {
  const { day: today, minute: nowMinute } = localDayMinute(Date.now());
  const earliest = shiftDay(today, -(LOAD_BACK_DAYS - 1));
  const days = [...new Set(rangeDays)].filter((d) => d >= earliest && d <= today).sort().reverse().slice(0, MAX_LOAD_DAYS);
  if (backfill && days.length < MAX_LOAD_DAYS) {
    // Tage ohne Werte oder mit älterer Rechenweise (Version) neu berechnen
    const { data: open, error } = await sb
      .from("garmin_daily")
      .select("day, v:load_daily_min->v")
      .eq("user_id", userId)
      .gte("day", earliest)
      .lte("day", today)
      .order("day", { ascending: false });
    if (error) throw new Error(error.message);
    for (const r of (open ?? []) as Any[]) {
      if (days.length >= MAX_LOAD_DAYS) break;
      if (Number(r.v) !== LOAD_VERSION && !days.includes(r.day)) days.push(r.day);
    }
  }
  if (!days.length) return { days: 0, note: "" };
  days.sort();
  const first = days[0];
  const last = days[days.length - 1];

  // Tageswerte (Schritte, Ruhepuls) und Aktivitäten aus der Datenbank, der Abruf oben hat sie schon gespeichert
  const { data: dRows, error: dErr } = await sb.from("garmin_daily").select("day, steps, resting_hr").eq("user_id", userId).gte("day", first).lte("day", last);
  if (dErr) throw new Error(dErr.message);
  const dayRow = new Map<string, Any>(((dRows ?? []) as Any[]).map((r) => [r.day, r]));
  const { data: aRows, error: aErr } = await sb
    .from("garmin_activities")
    .select("activity_id, start_local, duration_s, steps, training_load")
    .eq("user_id", userId)
    .gte("start_local", shiftDay(first, -1) + " 00:00:00")
    .lte("start_local", last + " 23:59:59");
  if (aErr) throw new Error(aErr.message);
  const acts = (aRows ?? []) as Any[];

  // Maximalpuls: höchster Wert aus Aktivitäten der letzten 12 Monate, sonst Startwert
  const { data: maxRows } = await sb
    .from("garmin_activities")
    .select("max_hr")
    .eq("user_id", userId)
    .gte("start_local", shiftDay(today, -365) + " 00:00:00")
    .not("max_hr", "is", null)
    .order("max_hr", { ascending: false })
    .limit(1);
  const actMax = Number((maxRows ?? [])[0]?.max_hr) || 0;
  const hrMax = actMax > HR_MAX_START ? actMax : HR_MAX_START;
  const hrMaxSource: LoadDay["puls_max_quelle"] = actMax > HR_MAX_START ? "aktivitaeten" : "startwert";
  const rests = [...dayRow.values()].map((r) => Number(r.resting_hr)).filter((v) => v > 30 && v < 120).sort((a, b) => a - b);
  const restFallback = rests.length ? rests[Math.floor(rests.length / 2)] : HR_REST_START;

  const hrKnown = { path: null as string | null, failed: false };
  const results: { day: string; base: Omit<LoadDay, "faktor" | "faktor_n" | "last_alltag">; curve: (number | null)[] | null; stepsOutside: number | null }[] = [];
  const actPoints = new Map<number, number>();
  const actDetail = new Map<number, ActDetail>();
  let note = "";

  for (const day of days) {
    let hrData: Any;
    try {
      hrData = await firstPath(token, HR_PATHS, day, hrKnown);
    } catch {
      note = "Der Tagespuls ist bei Garmin nicht abrufbar.";
      break;
    }
    const samples: Sample[] = [];
    for (const v of (hrData?.heartRateValues ?? []) as Any[]) {
      if (!Array.isArray(v) || typeof v[0] !== "number" || typeof v[1] !== "number" || v[1] < 30 || v[1] > 230) continue;
      const lm = localDayMinute(v[0]);
      if (lm.day === day) samples.push({ minute: lm.minute, hr: v[1] });
    }

    // Bewegung je Viertelstunde aus dem Stresswert „Bewegung“ (-2). Einen Schrittverlauf liefert die Personal API nicht (404).
    // Ohne Stressverlauf gilt die Regel der Nutzerin (22.11.): Zone 1 zählt ab 10 Minuten am Stück, Zone 2 und höher immer.
    const moving = new Set<number>();
    let bewegung: LoadDay["bewegung"] = "dauer";
    if (samples.length) {
      try {
        const values = await stressValues(token, day, stress);
        for (const v of values) {
          if (!Array.isArray(v) || typeof v[0] !== "number") continue;
          bewegung = "stress";
          if (v[1] !== -2) continue;
          const lm = localDayMinute(v[0]);
          if (lm.day === day) moving.add(Math.floor(lm.minute / 15));
        }
      } catch {
        // Garmin liefert keinen Stressverlauf (Stand 22.11.: 404): es gilt die 10-Minuten-Regel
      }
    }

    const dayActs = acts.filter((a) => {
      const d = String(a.start_local ?? "").slice(0, 10);
      return d === day || d === shiftDay(day, -1);
    });
    const intervals = activityIntervals(day, dayActs);
    const rest = Number(hrData?.restingHeartRate) || Number(dayRow.get(day)?.resting_hr) || restFallback;
    const c = computeDay(samples, intervals, rest, hrMax, bewegung === "stress" ? (m) => moving.has(Math.floor(m / 15)) : null);
    for (const [id, p] of c.actPoints) actPoints.set(id, (actPoints.get(id) ?? 0) + p);
    mergeActDetail(actDetail, c.actDetail);

    const todays = dayActs.filter((a) => String(a.start_local ?? "").slice(0, 10) === day);
    const steps = dayRow.get(day)?.steps;
    const actSteps = todays.reduce((s, a) => s + (Number(a.steps) || 0), 0);
    const stepsOutside = typeof steps === "number" ? Math.max(0, steps - actSteps) : null;
    // Heute zählt nur die Zeit seit Mitternacht: um 6:15 Uhr reichen gut 3 Stunden Puls, nicht 8
    const needed = day === today ? Math.min(MIN_COVERAGE, Math.round(nowMinute * 0.6)) : MIN_COVERAGE;
    const viaPulse = c.abdeckung >= needed;
    results.push({
      day,
      curve: samples.length ? c.curve : null,
      stepsOutside,
      base: {
        v: LOAD_VERSION,
        quelle: viaPulse ? "puls" : "schritte",
        bewegung,
        training: c.training,
        alltag: c.alltag,
        ohne_bewegung: c.ohne_bewegung,
        pkt_training: c.pkt_training,
        pkt_alltag: viaPulse ? c.pkt_alltag : pointsFromSteps(stepsOutside),
        abdeckung: c.abdeckung,
        puls_ruhe: rest,
        puls_max: hrMax,
        puls_max_quelle: hrMaxSource,
        last_training: Math.round(todays.reduce((s, a) => s + (Number(a.training_load) || 0), 0) * 10) / 10,
      },
    });
  }
  if (!results.length) return { days: 0, note };

  // Pulspunkte je Aktivität speichern, dann den persönlichen Faktor aus den letzten 30 Trainings bilden
  // Dazu Zonen und Pulsverlauf je Einheit (Training-Insights). Fehlen die Spalten noch, nur die Pulspunkte.
  if (actPoints.size) {
    const durOf = new Map<number, number | null>(acts.map((a) => [Number(a.activity_id), Number(a.duration_s) || null]));
    const rows = [...actPoints].map(([activity_id, p]) => {
      const d = actDetail.get(activity_id);
      return { user_id: userId, activity_id, hr_points: Math.round(p * 10) / 10, ...(d ? actDetailRow(d, durOf.get(activity_id) ?? null) : {}) };
    });
    let { error } = await sb.from("garmin_activities").upsert(rows, { onConflict: "user_id,activity_id" });
    if (error && /hr_zones|hr_series/.test(error.message)) {
      ({ error } = await sb
        .from("garmin_activities")
        .upsert(rows.map(({ user_id, activity_id, hr_points }) => ({ user_id, activity_id, hr_points })), { onConflict: "user_id,activity_id" }));
    }
    if (error) throw new Error("Pulspunkte der Aktivitäten: " + error.message);
  }
  const { data: fRows, error: fErr } = await sb
    .from("garmin_activities")
    .select("training_load, hr_points")
    .eq("user_id", userId)
    .not("hr_points", "is", null)
    .not("training_load", "is", null)
    .order("start_local", { ascending: false })
    .limit(60);
  if (fErr) throw new Error(fErr.message);
  const f = conversionFactor((fRows ?? []) as Any[]);
  const factor = f.faktor ?? FACTOR_START;

  const rows = results.map((r) => ({
    user_id: userId,
    day: r.day,
    hr_curve: r.curve,
    steps_outside_acts: r.stepsOutside,
    load_daily_min: { ...r.base, faktor: f.faktor, faktor_n: f.faktor ? f.n : 0, last_alltag: Math.round(r.base.pkt_alltag * factor * 10) / 10 } satisfies LoadDay,
  }));
  const { error } = await sb.from("garmin_daily").upsert(rows, { onConflict: "user_id,day" });
  if (error) throw new Error(error.message);
  return { days: rows.length, note };
}
