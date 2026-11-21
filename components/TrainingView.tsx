"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import WeekLoadCard from "@/components/training/WeekLoadCard";
import { loadInsightData } from "@/lib/insightData";
import type { Data } from "@/lib/insights";
import CalendarSection from "@/components/training/CalendarSection";
import KettlebellSection from "@/components/training/KettlebellSection";
import ClimbSection from "@/components/training/ClimbSection";
import KarateSection from "@/components/training/KarateSection";

const TABS: [string, string][] = [
  ["kalender", "Kalender"],
  ["kettlebell", "Kettlebell"],
  ["klettern", "Bouldern"],
  ["karate", "Karate"],
];

// Training: Kalender und die drei Sportarten mit eigenen Zielen
export default function TrainingView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : "kalender");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInsightData()
      .then(setData)
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  return (
    <>
      <PageHead title="Training" sub="Karate, Bouldern, Kettlebell und Ausdauer" />
      {error && <p className="alert" role="alert">{error}</p>}
      <WeekLoadCard data={data} />
      <div className="segmented">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "kalender" && <CalendarSection data={data} />}
      {tab === "kettlebell" && <KettlebellSection />}
      {tab === "klettern" && <ClimbSection />}
      {tab === "karate" && <KarateSection />}
    </>
  );
}
