"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackUse } from "@/lib/prefs";

// Zählt, welche Seiten geöffnet werden. Nur Zähler und Zeitpunkt, keine Inhalte, nur auf diesem Gerät.
export default function UsageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackUse(pathname || "/");
  }, [pathname]);
  return null;
}
