"use client";

import Link from "next/link";
import PageHead from "@/components/PageHead";
import KarateSection from "@/components/training/KarateSection";
import KettlebellSection from "@/components/training/KettlebellSection";
import ClimbSection from "@/components/training/ClimbSection";

// Eigene Seite je Sportart (Konzept docs/konzept-einfach.md, Paket 4). Inhalt wie der frühere Reiter.
const SEITEN = {
  karate: { titel: "Karate", inhalt: <KarateSection /> },
  kettlebell: { titel: "Kettlebell", inhalt: <KettlebellSection /> },
  bouldern: { titel: "Bouldern", inhalt: <ClimbSection /> },
};

export default function SportSeite({ slug }: { slug: keyof typeof SEITEN }) {
  const s = SEITEN[slug];
  return (
    <>
      <Link href="/training" className="back-link kal-zurueck">‹ Training</Link>
      <PageHead title={s.titel} tone="training" kalender="training" />
      {s.inhalt}
    </>
  );
}
