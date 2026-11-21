import type { Metadata } from "next";
import TrainingView from "@/components/TrainingView";

export const metadata: Metadata = { title: "Training · Health Coach" };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <TrainingView initial={t ?? "kalender"} />;
}
