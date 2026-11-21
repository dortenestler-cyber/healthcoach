"use client";

import { useState } from "react";
import PageHead from "@/components/PageHead";
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
  return (
    <>
      <PageHead title="Training" sub="Karate, Bouldern, Kettlebell und Ausdauer" />
      <div className="segmented">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "kalender" && <CalendarSection />}
      {tab === "kettlebell" && <KettlebellSection />}
      {tab === "klettern" && <ClimbSection />}
      {tab === "karate" && <KarateSection />}
    </>
  );
}
