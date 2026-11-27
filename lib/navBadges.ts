"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dayRule } from "@/lib/cycle";
import { loadInsightData } from "@/lib/insightData";
import { REFRESH_EVENT } from "@/lib/refresh";

// Zahl am Reiter Gesundheit: offenes Warnzeichen (Blutung, ärztlich abklären) und Infektverdacht von heute,
// je eins, bis die Seite Gesundheit geöffnet wurde. Ein Warnzeichen kommt nur bei neuem Text wieder, der Infektverdacht einmal je Tag.
const WARN_KEY = "hc_warn_seen";
const INFECT_KEY = "hc_infect_seen";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k) ?? "";
    } catch {
      return "";
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // nichts zu tun
    }
  },
};

// Leiste unten und Seitenleiste nutzen beide die Zahl: einmal laden, höchstens alle 5 Minuten (neue Daten gleich)
let shared: Promise<{ warn: string; infect: string }> | null = null;
let sharedAt = 0;
function loadOpen(): Promise<{ warn: string; infect: string }> {
  if (shared && Date.now() - sharedAt < 5 * 60 * 1000) return shared;
  sharedAt = Date.now();
  shared = loadInsightData(180)
    .then((data) => {
      const today = new Date().toLocaleDateString("sv-SE");
      const rule = data ? dayRule(today, data) : null;
      return { warn: rule?.redFlag ?? "", infect: rule?.infection ? today : "" };
    })
    .catch(() => {
      shared = null;
      return { warn: "", infect: "" };
    });
  return shared;
}

export function useHealthBadge(): number {
  const pathname = usePathname();
  const [open, setOpen] = useState<{ warn: string; infect: string }>({ warn: "", infect: "" });
  const [, setTick] = useState(0);
  const onHealth = pathname.startsWith("/gesundheit");

  useEffect(() => {
    let alive = true;
    const run = () => {
      if (document.visibilityState !== "visible") return;
      loadOpen()
        .then((o) => alive && setOpen(o))
        .catch(() => undefined);
    };
    const onNew = () => {
      shared = null;
      run();
    };
    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener(REFRESH_EVENT, onNew);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener(REFRESH_EVENT, onNew);
    };
  }, []);

  // Auf der Seite Gesundheit gelten beide als gesehen
  useEffect(() => {
    if (!onHealth) return;
    if (open.warn) store.set(WARN_KEY, open.warn);
    if (open.infect) store.set(INFECT_KEY, open.infect);
    setTick((t) => t + 1);
  }, [onHealth, open]);

  if (onHealth) return 0;
  return (open.warn && store.get(WARN_KEY) !== open.warn ? 1 : 0) + (open.infect && store.get(INFECT_KEY) !== open.infect ? 1 : 0);
}
