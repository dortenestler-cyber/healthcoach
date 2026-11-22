"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import { useFeatures, type Feature } from "@/lib/prefs";
import WeekLoadCard from "@/components/training/WeekLoadCard";
import RatioCard from "@/components/training/RatioCard";
import { isoDay } from "@/lib/dates";
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
const TAB_FEATURE: Record<string, Feature> = {kettlebell: "kettlebell", klettern: "bouldern", karate: "karate"};

export default function TrainingView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : "kalender");
  const feat = useFeatures();
  const tabs = TABS.filter(([k]) => !TAB_FEATURE[k] || feat[TAB_FEATURE[k]]);
  const shown = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
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
      {data && <RatioCard today={isoDay()} data={data} />}
      <div className="segmented">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={shown === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {shown === "kalender" && <CalendarSection data={data} />}
      {shown === "kettlebell" && <KettlebellSection />}
      {shown === "klettern" && <ClimbSection />}
      {shown === "karate" && <KarateSection />}
    </>
  );
}
