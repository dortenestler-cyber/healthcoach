"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import { useFeatures, type Feature } from "@/lib/prefs";
import TargetSection from "@/components/training/TargetSection";
import WeekLoadCard from "@/components/training/WeekLoadCard";
import RatioCard from "@/components/training/RatioCard";
import LoadTrendCard from "@/components/training/LoadTrendCard";
import HabitCard from "@/components/training/HabitCard";
import MonthReviewCard from "@/components/training/MonthReviewCard";
import { isoDay } from "@/lib/dates";
import { loadInsightData } from "@/lib/insightData";
import type { Data } from "@/lib/insights";
import CalendarSection from "@/components/training/CalendarSection";
import KettlebellSection from "@/components/training/KettlebellSection";
import ClimbSection from "@/components/training/ClimbSection";
import KarateSection from "@/components/training/KarateSection";

const TABS: [string, string][] = [
  ["kalender", "Kalender"],
  ["auswertung", "Auswertung"],
  ["kettlebell", "Kettlebell"],
  ["klettern", "Bouldern"],
  ["karate", "Karate"],
];

// Training: Status oben, darunter Reiter Kalender · Auswertung · die drei Sportarten mit eigenen Zielen.
// Auswertung bündelt Tagesziel, Lastkurve, Wochenlast, Trainingstage und Monatsrückblick.
const TAB_FEATURE: Record<string, Feature> = {kettlebell: "kettlebell", klettern: "bouldern", karate: "karate"};

export default function TrainingView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : "kalender");
  // Links auf einen Reiter (z. B. /training?t=auswertung von Heute) wechseln ihn auch, wenn die Seite schon offen ist
  useEffect(() => {
    if (TABS.some(([k]) => k === initial)) setTab(initial);
  }, [initial]);
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
      <PageHead title="Training" sub="Karate, Bouldern, Kettlebell und Ausdauer" tone="training" />
      {error && <p className="alert" role="alert">{error}</p>}
      {data && <RatioCard today={isoDay()} data={data} />}
      <div className="segmented segmented-tabs training-tabs" role="group" aria-label="Bereich">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={shown === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {shown === "kalender" && <CalendarSection data={data} />}
      {shown === "auswertung" && (
        <>
          {feat.tagesziel && data && <TargetSection data={data} />}
          {data && <LoadTrendCard today={isoDay()} data={data} />}
          <WeekLoadCard data={data} />
          {data && <HabitCard today={isoDay()} data={data} />}
          {data && <MonthReviewCard today={isoDay()} data={data} />}
        </>
      )}
      {shown === "kettlebell" && <KettlebellSection />}
      {shown === "klettern" && <ClimbSection />}
      {shown === "karate" && <KarateSection />}
    </>
  );
}
