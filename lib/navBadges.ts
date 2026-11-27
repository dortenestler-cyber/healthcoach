"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { redFlagFor } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";

// Zahl am Reiter Gesundheit: offenes Warnzeichen (Blutung, ärztlich abklären), bis die Seite Gesundheit geöffnet wurde.
const WARN_KEY = "hc_warn_seen";

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

export function useHealthBadge(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const onHealth = pathname.startsWith("/gesundheit");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    (async () => {
      let n = 0;
      // Offenes Warnzeichen
      const today = new Date().toLocaleDateString("sv-SE");
      const from = new Date(Date.now() - 12 * 864e5).toLocaleDateString("sv-SE");
      const { data } = await sb.from("diary_entries").select("day, bleeding").gte("day", from).order("day");
      const flag = redFlagFor(today, (data ?? []) as unknown as Diary[]);
      if (flag) {
        if (onHealth) store.set(WARN_KEY, flag);
        else if (store.get(WARN_KEY) !== flag) n += 1;
      }
      if (alive) setCount(n);
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname, onHealth]);

  return count;
}
