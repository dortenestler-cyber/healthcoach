"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const THRESHOLD = 72; // so weit ziehen, bis Loslassen aktualisiert
const MAX = 110;

// Ziehen nach unten am Seitenanfang aktualisiert (wie in Apps auf dem iPhone).
// Zeigt oben eine kleine Zeile: „Zum Aktualisieren ziehen“ · „Loslassen zum Aktualisieren“ · „Aktualisiere …“.
export default function PullToRefresh({ onRefresh, busy, children }: { onRefresh: () => void; busy: boolean; children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && !busy ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const d = e.touches[0].clientY - start.current;
      if (d <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const p = Math.min(MAX, d * 0.5);
      pullRef.current = p;
      setPull(p);
    };
    const up = () => {
      if (start.current !== null && pullRef.current >= THRESHOLD) onRefresh();
      start.current = null;
      pullRef.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [busy, onRefresh]);

  const shown = busy ? 44 : pull;
  const text = busy ? "Aktualisiere …" : pull >= THRESHOLD ? "Loslassen zum Aktualisieren" : "Zum Aktualisieren ziehen";

  return (
    <>
      <div className="ptr" style={{ height: shown }} aria-live="polite">
        {shown > 16 && (
          <span className="ptr-text">
            <span className={"ptr-spin" + (busy ? " ptr-run" : "")} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} aria-hidden="true" />
            {text}
          </span>
        )}
      </div>
      {children}
    </>
  );
}
