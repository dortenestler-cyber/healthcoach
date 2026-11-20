import type { Metadata } from "next";
import TrainingView from "@/components/TrainingView";

export const metadata: Metadata = { title: "Training · Health Coach" };

export default function TrainingPage() {
  return <TrainingView />;
}
