"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import CoachView from "@/components/CoachView";
import { coachPanel, useCoachPanel, useTablet, useWide } from "@/lib/layout";
import { useCoachPrefs } from "@/lib/prefs";

// Coach als Spalte rechts (ab 1024 px, einklappbar) oder als Fenster von rechts (768–1023 px).
// Auf dem iPhone bleibt der Coach eine eigene Seite.
export default function CoachPanel() {
  const wide = useWide();
  const tablet = useTablet();
  const { docked, overlay } = useCoachPanel();
  const { on } = useCoachPrefs();
  const pathname = usePathname();

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && coachPanel.setOverlay(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  if (!on || !tablet || pathname.startsWith("/coach")) return null;
  if (wide) {
    if (!docked) return null;
    return (
      <aside className="coach-panel" aria-label="Coach">
        <CoachView panel onClose={() => coachPanel.setDocked(false)} />
      </aside>
    );
  }
  if (!overlay) return null;
  return (
    <>
      <div className="coach-backdrop" onClick={() => coachPanel.setOverlay(false)} aria-hidden="true" />
      <aside className="coach-panel coach-overlay" aria-label="Coach" role="dialog" aria-modal="true">
        <CoachView panel onClose={() => coachPanel.setOverlay(false)} />
      </aside>
    </>
  );
}
