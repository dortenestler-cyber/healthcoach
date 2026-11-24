"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCoachPrefs } from "@/lib/prefs";
import { coachPanel, useCoachPanel, useTablet, useWide } from "@/lib/layout";

// Schwebender Knopf, auf jeder Seite sichtbar.
// Öffnet den Coach; im Coach selbst wird er zum Schließen-Knopf.
// Beim Scrollen nach unten weicht er aus, damit er keine Knöpfe verdeckt; beim Scrollen nach oben kommt er zurück.
export default function CoachButton() {
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname.startsWith("/coach");
  const { on } = useCoachPrefs();
  const wide = useWide();
  const tablet = useTablet();
  const panel = useCoachPanel();
  const hidden = useHideOnScrollDown(!open);

  const onClick = () => {
    // Ab 768 px öffnet der Knopf die Coach-Spalte bzw. das Fenster statt einer eigenen Seite
    if (tablet && !open) {
      if (wide) coachPanel.setDocked(true);
      else coachPanel.setOverlay(!panel.overlay);
      return;
    }
    if (!open) {
      router.push("/coach");
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Coach aus: Knopf nur noch auf der Coach-Seite selbst (zum Schließen)
  if (!on && !open) return null;
  if (tablet && !open && ((wide && panel.docked) || (!wide && panel.overlay))) return null;

  return (
    <button
      type="button"
      className="coach-fab"
      data-open={open}
      data-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      aria-label={open ? "Coach schließen" : "Coach öffnen"}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 5h16v11H9l-5 4zM7 10.5h2.5l1.5-2.5 2 5 1.5-2.5H17"} />
      </svg>
    </button>
  );
}

// true, solange die Seite nach unten gescrollt wird. Oben auf der Seite und beim Scrollen nach oben: false.
function useHideOnScrollDown(active: boolean): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active) {
      setHidden(false);
      return;
    }
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      else return;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active]);
  return hidden;
}
