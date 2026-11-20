import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Training · Health Coach" };

export default function TrainingPage() {
  return (
    <>
      <PageHead title="Training" sub="Karate, Klettern, Kettlebell" />
      <Placeholder phase="Phase 3" items={["Kalender", "Kettlebell-Pläne", "Klettern", "Karate · 5. Kyu"]} />
    </>
  );
}
