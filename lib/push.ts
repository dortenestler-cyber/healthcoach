"use client";

import { supabase } from "@/lib/supabase";

// Push-Mitteilungen für dieses Gerät ein- und ausschalten.
// Auf dem iPhone nur möglich, wenn Health Coach auf dem Home-Bildschirm liegt (ab iOS 16.4).

export type PushSupport = "ok" | "homescreen" | "none";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "none";
  const has = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (ios && !standalone) return "homescreen";
  return has ? "ok" : "none";
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase ist nicht verbunden.");
  const { data, error } = await sb.functions.invoke("push", { body });
  if (error) {
    let detail = error.message;
    try {
      const res = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") detail = (await res.json())?.error ?? detail;
    } catch {
      // Standardtext behalten
    }
    throw new Error(detail);
  }
  return data ?? {};
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) return reg;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

// checkin_reminder heißt in der App „Tagesstart“ (Migration 20261130100000_tagesstart_training)
export type Reminder = { checkin_reminder: boolean; remind_at: string; training_push?: boolean; show_values?: boolean };

export async function loadReminder(sub: PushSubscription): Promise<Reminder | null> {
  const { data } = (await supabase()?.from("push_subscriptions").select("*").eq("endpoint", sub.endpoint).maybeSingle()) ?? {};
  return (data as Reminder | null) ?? null;
}

export async function enablePush(remindAt: string): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Mitteilungen sind nicht erlaubt. Du kannst sie in den iPhone-Einstellungen unter Mitteilungen › Health Coach erlauben.");
  const { key } = await call({ action: "key" });
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(String(key)) }));
  const j = sub.toJSON();
  const { error } = await supabase()!
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: sub.endpoint,
        p256dh: j.keys?.p256dh ?? "",
        auth: j.keys?.auth ?? "",
        remind_at: remindAt,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
        checkin_reminder: true,
      },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message);
}

export async function setReminder(sub: PushSubscription, r: Partial<Reminder>): Promise<void> {
  const { error } = await supabase()!.from("push_subscriptions").update(r).eq("endpoint", sub.endpoint);
  if (error) throw new Error(error.message);
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase()?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function testPush(): Promise<void> {
  await call({ action: "test" });
}
