import type { Metadata } from "next";
import CoachHintsView from "@/components/CoachHintsView";

export const metadata: Metadata = { title: "Hinweise des Coachs · Health Coach" };

export default function CoachHinweisePage() {
  return <CoachHintsView />;
}
