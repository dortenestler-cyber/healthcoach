// Health Coach · Edge Function "push"
// Verschickt Push-Mitteilungen, zum Beispiel die Erinnerung an den Morgen-Check-in.
//
// Benötigte Secrets in Supabase (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY    öffentlicher Schlüssel (erzeugen mit: npx web-push generate-vapid-keys)
//   VAPID_PRIVATE_KEY   privater Schlüssel dazu
//   VAPID_SUBJECT       Kontakt, z. B. mailto:deine@adresse.de
//   PUSH_CRON_SECRET    beliebiges langes Passwort, das auch im Zeitplan (pg_cron) steht
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, Server-Schlüssel
//
// Aktionen (POST, JSON):
//   { action: "key" }   öffentlichen Schlüssel für die App liefern (mit Login)
//   { action: "test" }  Testmitteilung an die eigenen Geräte (mit Login)
//   { action: "due" }   fälligen Tagesstart, Tagesabschluss und Getränke-Erinnerung verschicken (nur Zeitplan, mit x-cron-secret)
//   { action: "training" } neue Einheiten melden (garmin-sync nach dem Abruf, mit x-cron-secret)

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { tagesabschluss, tagesstart, trainingMessages } from "./nachrichten.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; remind_at: string; time_zone: string; checkin_reminder: boolean; last_sent_on: string | null; training_push?: boolean; show_values?: boolean; evening_push?: boolean; evening_at?: string; evening_sent_on?: string | null; drink_push?: boolean; drink_sent_at?: string | null };

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

const localDay = (tz: string, d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(d);
const localTime = (tz: string, d = new Date()) =>
  new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

// "07:30" + 2 Stunden → "09:30" (für den Vergleich als Text)
function addHours(hhmm: string, h: number): string {
  const [a, b] = hhmm.split(":").map(Number);
  const m = Math.min(23 * 60 + 59, (a || 0) * 60 + (b || 0) + h * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function safeTz(tz: string): string {
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: tz });
    return tz;
  } catch {
    return "Europe/Berlin";
  }
}

// Sendet eine Mitteilung. Abgemeldete Geräte (404/410) werden gelöscht.
// deno-lint-ignore no-explicit-any
async function send(admin: any, s: Sub, payload: Record<string, unknown>): Promise<boolean> {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const pub = Deno.env.get("VAPID_PUBLIC_KEY");
    const priv = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:health-coach@example.invalid";
    if (!pub || !priv) return json(500, { error: "VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlt in den Supabase-Secrets." });
    webpush.setVapidDetails(subject, pub, priv);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const url = Deno.env.get("SUPABASE_URL")!;

    // Zeitplan (alle 15 Minuten): Tagesstart ab der eingestellten Uhrzeit, einmal am Tag.
    // Fehlen die Garmin-Werte der Nacht noch, wartet er bis zu zwei Stunden auf den Abruf.
    if (action === "due") {
      const secret = Deno.env.get("PUSH_CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) return json(401, { error: "Nicht erlaubt." });
      const admin = createClient(url, serviceKey());
      const { data, error } = await admin.from("push_subscriptions").select("*");
      if (error) return json(500, { error: error.message });
      let sent = 0;
      const cache = new Map<string, Awaited<ReturnType<typeof tagesstart>>>();
      const evening = new Map<string, Awaited<ReturnType<typeof tagesabschluss>>>();
      const lastDrink = new Map<string, string | null>();
      for (const s of (data ?? []) as Sub[]) {
        const tz = safeTz(s.time_zone);
        const today = localDay(tz);
        const now = localTime(tz);
        // Tagesabschluss am Abend, einmal am Tag (bis 23:30 Uhr, danach nicht mehr)
        if (s.evening_push && s.evening_at && s.evening_sent_on !== today && now >= s.evening_at && now < "23:30") {
          const key = s.user_id + today;
          if (!evening.has(key)) evening.set(key, await tagesabschluss(admin, s.user_id, today));
          const m = evening.get(key)!;
          await admin.from("push_subscriptions").update({ evening_sent_on: today }).eq("id", s.id);
          if (await send(admin, s, s.show_values === false ? m.quiet : m.full)) sent++;
        }
        // Getränke-Erinnerung: zwischen 8 und 20 Uhr, wenn seit 3 Stunden nichts getrunken oder erinnert wurde
        if (s.drink_push !== false && now >= "08:00" && now < "20:00") {
          if (!lastDrink.has(s.user_id)) {
            const { data: d, error: de } = await admin.from("drink_log").select("at").eq("user_id", s.user_id).order("at", { ascending: false }).limit(1);
            lastDrink.set(s.user_id, de || !d?.length ? null : String(d[0].at));
          }
          let anchor = "08:00";
          for (const at of [lastDrink.get(s.user_id), s.drink_sent_at]) {
            if (at && localDay(tz, new Date(at)) === today) {
              const t = localTime(tz, new Date(at));
              if (t > anchor) anchor = t;
            }
          }
          if (now >= addHours(anchor, 3)) {
            await admin.from("push_subscriptions").update({ drink_sent_at: new Date().toISOString() }).eq("id", s.id);
            if (await send(admin, s, { title: "Health Coach", body: "Seit 3 Stunden nichts getrunken.", url: "/tagebuch" })) sent++;
          }
        }
        if (!s.checkin_reminder || s.last_sent_on === today || now < s.remind_at) continue;
        const key = s.user_id + today;
        if (!cache.has(key)) cache.set(key, await tagesstart(admin, s.user_id, today));
        const m = cache.get(key)!;
        if (!m.ready && now < addHours(s.remind_at, 2)) continue;
        await admin.from("push_subscriptions").update({ last_sent_on: today }).eq("id", s.id);
        if (await send(admin, s, s.show_values === false ? m.quiet : m.full)) sent++;
      }
      return json(200, { ok: true, sent });
    }

    // Nach dem Abruf: Einheiten ohne Mitteilung melden, die vor höchstens 6 Stunden endeten
    if (action === "training") {
      const secret = Deno.env.get("PUSH_CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) return json(401, { error: "Nicht erlaubt." });
      const admin = createClient(url, serviceKey());
      const msgs = await trainingMessages(admin);
      let sent = 0;
      for (const m of msgs) {
        const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", m.user_id);
        for (const s of (subs ?? []) as Sub[]) {
          if (s.training_push === false) continue;
          if (await send(admin, s, s.show_values === false ? m.quiet : m.full)) sent++;
        }
      }
      return json(200, { ok: true, units: msgs.length, sent });
    }

    // Ab hier nur mit Login
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return json(401, { error: "Nicht angemeldet." });

    if (action === "key") return json(200, { key: pub });

    if (action === "test") {
      const { data } = await sb.from("push_subscriptions").select("*");
      const subs = (data ?? []) as Sub[];
      if (!subs.length) return json(400, { error: "Auf keinem Gerät sind Mitteilungen eingeschaltet." });
      let sent = 0;
      for (const s of subs) if (await send(sb, s, { title: "Health Coach", body: "Mitteilungen funktionieren.", url: "/einstellungen" })) sent++;
      return json(200, { ok: sent > 0, sent });
    }

    return json(400, { error: "Unbekannte Aktion." });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
