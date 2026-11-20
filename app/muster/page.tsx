import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Muster · Health Coach" };

export default function MusterPage() {
  return (
    <>
      <PageHead title="Muster" sub="Training, Erholung und Zyklus zusammen" />
      <Placeholder phase="Phase 4" items={["Puls bei gleicher Anstrengung", "Training und die Nacht danach", "Bufori-Bedarf nach Situation"]} />
    </>
  );
}
