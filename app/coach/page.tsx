import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Placeholder from "@/components/Placeholder";

export const metadata: Metadata = { title: "Coach · Health Coach" };

export default function CoachPage() {
  return (
    <>
      <PageHead title="Coach" sub="Kennt Training, Erholung, Symptome und Medikamente" />
      <Placeholder phase="Phase 4" items={["Chat mit dem Coach"]} />
    </>
  );
}
