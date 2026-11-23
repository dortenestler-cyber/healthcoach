"use client";

import type { ReactNode } from "react";
import { useCoachPanel, useMedia } from "@/lib/layout";
import { useCoachPrefs } from "@/lib/prefs";

// Zwei Spalten am Computer (Konzept Web-App). Auf dem iPhone und schmalen Fenstern steht rechts unter links,
// die Reihenfolge bleibt also wie auf dem iPhone. Zwei Spalten erst, wenn der Inhalt breit genug ist:
// ab 1360 px mit Coach-Spalte, ab 1024 px wenn die Coach-Spalte eingeklappt oder aus ist.
export function useTwoCols(): boolean {
  const xl = useMedia("(min-width: 1360px)");
  const lg = useMedia("(min-width: 1024px)");
  const { docked } = useCoachPanel();
  const { on } = useCoachPrefs();
  return xl || (lg && (!docked || !on));
}

export default function TwoCol({ left, right }: { left: ReactNode; right: ReactNode }) {
  const wide = useTwoCols();
  return (
    <div className={wide ? "two-col is-wide" : "two-col"}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
