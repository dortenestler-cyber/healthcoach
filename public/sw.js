// Health Coach · Offline-Cache
// Seiten und Daten: erst aus dem Netz, ohne Netz aus dem Cache (zuletzt geladener Stand).
// Feste Dateien von Next.js (/_next/static): aus dem Cache, weil sich ihr Name bei jeder Änderung ändert.
// Funktionen (Coach, Garmin-Abruf, Uhr) und alles außer GET werden nie zwischengespeichert.

const VERSION = "hc-v2";
const PAGES = VERSION + "-seiten";
const STATIC = VERSION + "-dateien";
const DATA = "hc-daten"; // wird beim Abmelden geleert
const START = ["/", "/tagebuch", "/training", "/muster", "/gesundheit", "/einstellungen", "/begriffe", "/icons/icon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(START.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC && k !== DATA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "abgemeldet") e.waitUntil(caches.delete(DATA));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
      e.respondWith(cacheFirst(req));
    } else if (req.mode === "navigate" || url.pathname.startsWith("/_next/")) {
      e.respondWith(networkFirst(req, PAGES));
    }
    return;
  }

  // Supabase: nur Lesezugriffe auf Tabellen (REST), keine Anmeldung, keine Funktionen
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/")) {
    e.respondWith(networkFirst(req, DATA));
  }
});

// Push-Mitteilungen (Erinnerung an den Check-in, Testmitteilung)
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration
      .showNotification(d.title || "Health Coach", {
        body: d.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: d.url || "/" },
      })
      .then(updateBadge)
  );
});

// Zahl am App-Symbol: so viele Mitteilungen liegen ungelesen da (ohne Speicher, direkt aus den angezeigten Mitteilungen)
async function updateBadge() {
  try {
    const n = (await self.registration.getNotifications()).length;
    if (n > 0) await self.navigator.setAppBadge(n);
    else await self.navigator.clearAppBadge();
  } catch {
    // Browser ohne Badge-Unterstützung
  }
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(updateBadge());
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
