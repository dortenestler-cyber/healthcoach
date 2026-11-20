import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Gesundheit · Health Coach" };

export default function GesundheitPage() {
  return (
    <>
      <PageHead title="Gesundheit" sub="Krankheiten, Verletzungen, Medikamente, Körper" />
      <Placeholder phase="Phase 3" items={["Krankheit", "Verletzung", "Medikamente und Supplements", "Körperwerte"]} />
    </>
  );
}
