"use client";

import { useEffect, useState } from "react";

// Meldet den Offline-Cache an und zeigt an, wenn kein Netz da ist.
// Neue App-Version (Konzept Datenaktualisierung A7): Beim Zurückkehren in die App und alle 15 Minuten vergleicht sie ihre Kennung mit /version.
// Ist eine da, erscheint unten „Neue Version · Tippen zum Laden“.
export default function ServiceWorker() {
  const [offline, setOffline] = useState(false);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); // ohne Offline-Cache geht es auch
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    let last = 0;
    const check = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 5 * 60 * 1000 || !mine) return;
      last = Date.now();
      fetch("/version", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v: { build?: string } | null) => v?.build && v.build !== mine && setFresh(true))
        .catch(() => undefined);
    };
    check();
    const t = window.setInterval(check, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <>
      {offline && (
        <p className="offline-note" role="status">
          Kein Netz. Du siehst den zuletzt geladenen Stand, Änderungen werden erst mit Netz gespeichert.
        </p>
      )}
      {fresh && !offline && (
        <button type="button" className="update-note" onClick={() => window.location.reload()}>
          Neue Version · Tippen zum Laden
        </button>
      )}
    </>
  );
}

// Beim Abmelden die zwischengespeicherten Daten löschen
export function clearOfflineData(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage("abgemeldet");
    caches?.delete("hc-daten");
  } catch {
    // nichts zu tun
  }
}
