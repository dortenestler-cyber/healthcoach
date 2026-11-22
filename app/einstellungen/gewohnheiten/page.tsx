import type { Metadata } from "next";
import HabitsView from "@/components/settings/HabitsView";

export const metadata: Metadata = { title: "Gewohnheiten · Health Coach" };

export default function Page() {
  return <HabitsView />;
}
