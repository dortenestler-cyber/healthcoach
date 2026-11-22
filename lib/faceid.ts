"use client";

// Face ID (oder Touch ID) als schnellere Entsperrung zusätzlich zur PIN.
// Technisch: ein Gerätepasskey (WebAuthn, nur dieses Gerät, Nutzerprüfung Pflicht).
// Er entsperrt nur die lokale PIN-Sperre, die Anmeldung bei Supabase bleibt unberührt.
// Die PIN bleibt immer als Rückfall, falls Face ID fehlschlägt oder abgebrochen wird.

const KEY = "hc_faceid";

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function random(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

export function faceIdOn(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export async function faceIdAvailable(): Promise<boolean> {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

// Legt den Gerätepasskey an. Fragt dabei einmal Face ID ab.
export async function enableFaceId(): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        rp: { name: "Health Coach", id: location.hostname },
        user: { id: random(16), name: "Health Coach", displayName: "Health Coach" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return "Face ID wurde nicht eingerichtet.";
    localStorage.setItem(KEY, toB64(cred.rawId));
    return null;
  } catch (e) {
    return e instanceof DOMException && e.name === "NotAllowedError"
      ? "Abgebrochen. Face ID ist weiter aus."
      : "Face ID ließ sich nicht einrichten. Die PIN funktioniert weiter.";
  }
}

export function disableFaceId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}

// true = Face ID erfolgreich. Bei Abbruch oder Fehler false, dann bleibt die PIN.
export async function checkFaceId(): Promise<boolean> {
  const id = (() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  })();
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
    return !!res;
  } catch {
    return false;
  }
}
