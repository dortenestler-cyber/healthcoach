"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCoachPrefs } from "@/lib/prefs";

export type ExplainTone = "recovery" | "training" | "cycle" | "stress" | "sleep";

// Erklärkarte unter einem großen Wert (Konzept dunkel 2, Muster 3): ein Satz zum Ergebnis, wichtige Zahlen fett.
// Darunter der Coach-Einstieg: öffnet den Coach mit einer passenden Frage. Gesendet wird erst nach deinem Tippen.
export default function ExplainCard({ children, question, tip, tone = "recovery" }: { children: ReactNode; question?: string; tip?: ReactNode; tone?: ExplainTone }) {
  const coach = useCoachPrefs();
  return (
    <div className="explain" data-tone={tone}>
      <p className="explain-text">{children}</p>
      {tip && <p className="explain-tip">{tip}</p>}
      {question && coach.on && (
        <Link href={`/coach?frage=${encodeURIComponent(question)}`} className="explain-link">
          Mehr dazu im Coach <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
