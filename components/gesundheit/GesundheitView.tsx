"use client";

import { useState } from "react";
import PageHead from "@/components/PageHead";
import MedsSection from "@/components/gesundheit/MedsSection";
import IllnessSection from "@/components/gesundheit/IllnessSection";
import InjurySection from "@/components/gesundheit/InjurySection";
import BodySection from "@/components/gesundheit/BodySection";

const TABS: [string, string][] = [
  ["med", "Medikamente"],
  ["krank", "Krankheit"],
  ["verl", "Verletzung"],
  ["koerper", "Körper"],
];

export default function GesundheitView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initial) ? initial : "med");
  return (
    <>
      <PageHead title="Gesundheit" sub="Medikamente, Krankheiten, Verletzungen, Körper" />
      <div className="segmented">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "med" && <MedsSection />}
      {tab === "krank" && <IllnessSection />}
      {tab === "verl" && <InjurySection />}
      {tab === "koerper" && <BodySection />}
    </>
  );
}
