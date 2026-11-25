"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import CalendarSection from "@/components/training/CalendarSection";
import { EBENEN, type Ebene } from "@/components/kalender/Monatskalender";
import { loadInsightData } from "@/lib/insightData";
import { useRefresh } from "@/lib/refresh";
import type { Data } from "@/lib/insights";
import type { Von } from "@/lib/kalender";

// Zentraler Kalender (Konzept docs/konzept-einfach.md, Paket 3). Kein eigener Navigationspunkt:
// Er öffnet sich über das Datum auf Heute und über das Kalender-Symbol im Kopf jedes Bereichs.
// Jeder Einstieg bringt seine Ebenen mit und merkt sich die Wahl für sich (Logbuch 25.11.).

const VORWAHL: Record<Von, { start: Ebene[]; zurueck: [string, string] }> = {
  heute: { start: ["zyklus", "training", "symptome"], zurueck: ["/", "Heute"] },
  tagebuch: { start: ["symptome", "gewohnheiten"], zurueck: ["/tagebuch", "Tagebuch"] },
  training: { start: ["training"], zurueck: ["/training", "Training"] },
  zyklus: { start: ["zyklus", "symptome"], zurueck: ["/zyklus", "Zyklus"] },
  gesundheit: { start: ["krank", "medikamente"], zurueck: ["/gesundheit", "Gesundheit"] },
};

export default function KalenderView({ von, tag }: { von: Von; tag?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    loadInsightData()
      .then(setData)
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useRefresh(load);

  const [href, wort] = VORWAHL[von].zurueck;
  return (
    <>
      <Link href={href} className="back-link kal-zurueck">‹ {wort}</Link>
      <PageHead title="Kalender" />
      {error && <p className="alert" role="alert">{error}</p>}
      <CalendarSection
        key={von}
        data={data}
        ebenen={EBENEN.map((e) => e.key)}
        start={VORWAHL[von].start}
        merken={`zentral.${von}`}
        tag={tag}
        kompakt
        zeitraum
        onChanged={load}
      />
    </>
  );
}
