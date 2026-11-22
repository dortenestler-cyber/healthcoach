"use client";

import { useState } from "react";
import PageHead from "@/components/PageHead";
import { useFeatures, type Feature } from "@/lib/prefs";
import MedsSection from "@/components/gesundheit/MedsSection";
import IllnessSection from "@/components/gesundheit/IllnessSection";
import InjurySection from "@/components/gesundheit/InjurySection";
import BodySection from "@/components/gesundheit/BodySection";
import CycleSection from "@/components/gesundheit/CycleSection";

const TABS: [string, string][] = [
  ["med", "Medikamente"],
  ["krank", "Krankheit"],
  ["verl", "Verletzung"],
  ["zyklus", "Zyklus"],
  ["koerper", "Körper"],
];

const TAB_FEATURE: Record<string, Feature> = {med: "medikamente", krank: "krankheit", verl: "verletzung", zyklus: "zyklus"};

export default function GesundheitView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : "med");
  const feat = useFeatures();
  const tabs = TABS.filter(([k]) => !TAB_FEATURE[k] || feat[TAB_FEATURE[k]]);
  const shown = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
  return (
    <>
      <PageHead title="Gesundheit" sub="Medikamente, Krankheiten, Verletzungen, Zyklus, Körper" />
      <div className="segmented segmented-tabs">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={shown === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {shown === "med" && <MedsSection />}
      {shown === "krank" && <IllnessSection />}
      {shown === "verl" && <InjurySection />}
      {shown === "zyklus" && <CycleSection showFlashes={feat.perimenopause} />}
      {shown === "koerper" && <BodySection />}
    </>
  );
}
