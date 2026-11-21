"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isoDay } from "@/lib/dates";
import { computeTarget, loadPercent, type Data, type Target } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import Ring from "@/components/Ring";

export function targetText(t: Target, load: number): string {
  if (t.pause) return "Heute ist Erholung dran. Dein Körper braucht die Kraft für die Genesung.";
  if (load < t.lo) return `Noch ${t.lo - load} % bis zum Zielbereich. Eine Einheit wie geplant bringt dich hinein.`;
  if (load <= t.hi) return "Du bist im Zielbereich. Ab jetzt nur noch locker, etwa Gehen.";
  return "Über dem Ziel. Plane morgen eher leicht.";
}

// Belastung heute (Tagesziel-Ring) auf der Seite Heute. Mit data rechnet die Karte aus den übergebenen Daten.
export default function TargetCard({ data: given }: { data?: Data | null } = {}) {
  const [state, setState] = useState<{ t: Target; load: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (given === null) return; // die Seite lädt die Daten noch
    if (given) {
      const day = isoDay();
      setState({ t: computeTarget(day, given), load: loadPercent(day, given.daily, given.acts) });
      return;
    }
    loadInsightData()
      .then((data) => {
        if (!data) return;
        const day = isoDay();
        setState({ t: computeTarget(day, data), load: loadPercent(day, data.daily, data.acts) });
      })
      .catch((e) => setError("Tagesziel konnte nicht berechnet werden: " + (e instanceof Error ? e.message : String(e))));
  }, [given]);

  if (error) return <p className="alert">{error}</p>;
  if (!state) return null;
  const { t, load } = state;

  return (
    <Link href="/tagesziel" className="card target-card">
      <Ring load={load} lo={t.lo} hi={t.hi} size={128} />
      <div className="stack">
        <span className="meta">Belastung heute ›</span>
        <span className="target-label">{t.pause ? "Pause" : `${t.label}, ${t.lo}–${t.hi} %`}</span>
        <span className="target-text">{targetText(t, load)}</span>
        {!t.enoughData && <span className="meta">Wird genauer, sobald 7 Tage Garmin-Daten da sind.</span>}
      </div>
    </Link>
  );
}
