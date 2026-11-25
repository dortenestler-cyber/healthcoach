import type { Metadata } from "next";
import KalenderView from "@/components/kalender/KalenderView";
import { istVon } from "@/lib/kalender";

export const metadata: Metadata = { title: "Kalender · Health Coach" };

// /kalender?von=zyklus&tag=2026-11-25 · von bestimmt die Ebenen zu Beginn, tag den gewählten Tag
export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ von?: string; tag?: string }> }) {
  const { von, tag } = await searchParams;
  return <KalenderView von={istVon(von) ? von : "heute"} tag={tag} />;
}
