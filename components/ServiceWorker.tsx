"use client";

import { useEffect, useState } from "react";

// Meldet den Offline-Cache an und zeigt an, wenn kein Netz da ist.
export default function ServiceWorker() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ohne Offline-Cache geht es auch
      });
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <p className="offline-note" role="status">
      Kein Netz. Du siehst den zuletzt geladenen Stand, Änderungen werden erst mit Netz gespeichert.
    </p>
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
