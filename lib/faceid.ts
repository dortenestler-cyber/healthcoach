"use client";

// Face ID (bzw. Touch ID) als schneller Weg zum Entsperren, zusätzlich zur PIN.
// Technisch ein Passkey nur für dieses Gerät (WebAuthn). Gespeichert wird nur die Kennung
// des Schlüssels, keine biometrischen Daten. Die PIN bleibt immer als Rückfall.
// Wie die PIN ist das eine Sperre auf dem Gerät; die Anmeldung bei Supabase bleibt bestehen.

import { markUnlocked } from "@/lib/pin";

const KEY = "hc_faceid";

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function random(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

export async function faceIdAvailable(): Promise<boolean> {
  try {
    return typeof window !== "undefined" && !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

export function faceIdOn(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export async function enableFaceId(): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        rp: { name: "Health Coach", id: location.hostname },
        user: { id: random(16), name: "health-coach", displayName: "Health Coach" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(KEY, toB64(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

export function disableFaceId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}

// Fragt Face ID ab. Bei Erfolg gilt die App als entsperrt.
export async function unlockWithFaceId(): Promise<boolean> {
  let id: string | null = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (!id) return false;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: fromB64(id), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    if (!res) return false;
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}
