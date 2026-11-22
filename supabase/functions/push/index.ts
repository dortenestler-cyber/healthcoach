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
//   { action: "due" }   fällige Erinnerungen an alle verschicken (nur Zeitplan, mit x-cron-secret)

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; remind_at: string; time_zone: string; checkin_reminder: boolean; last_sent_on: string | null };

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

    // Zeitplan: fällige Erinnerungen an alle
    if (action === "due") {
      const secret = Deno.env.get("PUSH_CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) return json(401, { error: "Nicht erlaubt." });
      const admin = createClient(url, serviceKey());
      const { data, error } = await admin.from("push_subscriptions").select("*").eq("checkin_reminder", true);
      if (error) return json(500, { error: error.message });
      let sent = 0;
      for (const s of (data ?? []) as Sub[]) {
        const tz = safeTz(s.time_zone);
        const today = localDay(tz);
        if (s.last_sent_on === today || localTime(tz) < s.remind_at) continue;
        // Schon eingecheckt? Dann keine Erinnerung.
        const { data: c } = await admin.from("checkins").select("id").eq("user_id", s.user_id).eq("day", today).maybeSingle();
        await admin.from("push_subscriptions").update({ last_sent_on: today }).eq("id", s.id);
        if (c) continue;
        if (await send(admin, s, { title: "Morgen-Check-in", body: "Wie hast du geschlafen? 30 Sekunden für deinen Check-in.", url: "/" })) sent++;
      }
      return json(200, { ok: true, sent });
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
