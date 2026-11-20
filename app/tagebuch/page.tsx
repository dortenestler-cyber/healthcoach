import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Tagebuch · Health Coach" };

export default function TagebuchPage() {
  return (
    <>
      <PageHead title="Tagebuch" sub="Eintrag für heute" />
      <Placeholder phase="Phase 1" items={["Blutung und Zyklus", "Symptome", "Einflüsse", "Verlauf, 4 Wochen"]} />
    </>
  );
}
