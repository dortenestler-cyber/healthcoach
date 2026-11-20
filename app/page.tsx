import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Health Coach" };

export default function HeutePage() {
  return (
    <>
      <PageHead title="Heute" sub="Tagesziel, Erholung und was heute ansteht" />
      <Placeholder phase="Phase 1 und 2" items={["Tagesziel", "Garmin-Werte", "Morgen-Check-in", "Medikamente und Supplements"]} />
    </>
  );
}
