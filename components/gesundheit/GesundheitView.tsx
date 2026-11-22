"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import { useFeatures, type Feature } from "@/lib/prefs";
import MedsSection from "@/components/gesundheit/MedsSection";
import IllnessSection from "@/components/gesundheit/IllnessSection";
import InjurySection from "@/components/gesundheit/InjurySection";
import BodySection from "@/components/gesundheit/BodySection";
import OverviewSection from "@/components/gesundheit/OverviewSection";

const TABS: [string, string][] = [
  ["ueberblick", "Überblick"],
  ["med", "Medikamente"],
  ["krankverl", "Krank & verletzt"],
  ["koerper", "Körper"],
];

const TAB_FEATURE: Record<string, Feature> = { med: "medikamente" };
// Alte Links (?t=krank, ?t=verl) führen in den gemeinsamen Reiter
const ALIAS: Record<string, string> = { krank: "krankverl", verl: "krankverl" };

export default function GesundheitView({ initial }: { initial: string }) {
  const start = ALIAS[initial] ?? initial;
  const [tab, setTab] = useState(TABS.some(([k]) => k === start) ? start : "ueberblick");
  // Links innerhalb der Seite (z. B. aus dem Überblick) wechseln den Reiter
  useEffect(() => {
    if (TABS.some(([k]) => k === start)) setTab(start);
  }, [start]);
  const feat = useFeatures();
  const tabs = TABS.filter(([k]) => (k === "krankverl" ? feat.krankheit || feat.verletzung : !TAB_FEATURE[k] || feat[TAB_FEATURE[k]]));
  const shown = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
  return (
    <>
      <PageHead title="Gesundheit" sub="Muster, Gewohnheiten, Medikamente, Körper" tone="gesundheit" />
      <div className="segmented segmented-tabs segmented-4">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={shown === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {shown === "ueberblick" && <OverviewSection />}
      {shown === "med" && <MedsSection />}
      {shown === "krankverl" && (
        <>
          {feat.krankheit && <IllnessSection />}
          {feat.verletzung && <InjurySection />}
        </>
      )}
      {shown === "koerper" && <BodySection />}
    </>
  );
}
