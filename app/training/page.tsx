import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TrainingView from "@/components/TrainingView";

export const metadata: Metadata = { title: "Training · Health Coach" };

// Frühere Reiter der Sportarten haben jetzt eigene Seiten (Konzept Einfach, Paket 4)
const SPORT: Record<string, string> = { karate: "karate", kettlebell: "kettlebell", klettern: "bouldern" };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  if (t && SPORT[t]) redirect(`/training/${SPORT[t]}`);
  return <TrainingView initial={t ?? "uebersicht"} />;
}
