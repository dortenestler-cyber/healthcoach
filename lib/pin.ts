"use client";

// Lokale PIN-Sperre. Die PIN entsperrt die App auf diesem Gerät.
// Sie ersetzt nicht die Anmeldung bei Supabase, die bleibt im Hintergrund bestehen.
// Gespeichert wird nur ein Hash (mit Salz), nie die PIN selbst.

const KEY = "hc_pin";
const UNLOCK_KEY = "hc_unlocked_at";
const FAIL_KEY = "hc_pin_fails";
export const LOCK_AFTER_MS = 5 * 60 * 1000;
export const MAX_FAILS = 5;

type Stored = { salt: string; hash: string };

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function hasPin(): boolean {
  return read() !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await sha256(salt + pin);
  localStorage.setItem(KEY, JSON.stringify({ salt, hash }));
  localStorage.removeItem(FAIL_KEY);
  markUnlocked();
}

export async function checkPin(pin: string): Promise<boolean> {
  const s = read();
  if (!s) return false;
  const ok = (await sha256(s.salt + pin)) === s.hash;
  if (ok) {
    localStorage.removeItem(FAIL_KEY);
    markUnlocked();
  } else {
    localStorage.setItem(FAIL_KEY, String(fails() + 1));
  }
  return ok;
}

export function fails(): number {
  try {
    return Number(localStorage.getItem(FAIL_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FAIL_KEY);
    localStorage.removeItem("hc_faceid");
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // nichts zu tun
  }
}

// Entsperrt gilt nur für diese Sitzung der App und nur bis 5 Minuten im Hintergrund.
export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    // nichts zu tun
  }
}

export function isUnlocked(): boolean {
  try {
    const t = Number(sessionStorage.getItem(UNLOCK_KEY) ?? "0");
    return t > 0 && Date.now() - t < LOCK_AFTER_MS;
  } catch {
    return false;
  }
}

export function lock(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // nichts zu tun
  }
}
