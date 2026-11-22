"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCoachPrefs } from "@/lib/prefs";

// Schwebender Knopf, auf jeder Seite sichtbar.
// Öffnet den Coach; im Coach selbst wird er zum Schließen-Knopf.
export default function CoachButton() {
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname.startsWith("/coach");
  const { on } = useCoachPrefs();

  const onClick = () => {
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

  return (
    <button
      type="button"
      className="coach-fab"
      data-open={open}
      aria-label={open ? "Coach schließen" : "Coach öffnen"}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 5h16v11H9l-5 4z"} />
      </svg>
    </button>
  );
}
