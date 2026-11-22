import type { Metadata } from "next";
import FeaturesView from "@/components/settings/FeaturesView";

export const metadata: Metadata = { title: "Funktionen · Health Coach" };

export default function Page() {
  return <FeaturesView />;
}
