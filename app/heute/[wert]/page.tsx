import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeuteDetail from "@/components/heute/HeuteDetail";
import { DETAILS, type DetailKey } from "@/lib/heuteDetails";

export const metadata: Metadata = { title: "Heute · Health Coach" };

// Detailseiten hinter den Ringen auf Heute: /heute/readiness, /heute/schlaf, /heute/belastung, /heute/stress, /heute/energie, /heute/intensitaet
export default async function Page({ params, searchParams }: { params: Promise<{ wert: string }>; searchParams: Promise<{ tag?: string }> }) {
  const { wert } = await params;
  const { tag } = await searchParams;
  if (!(wert in DETAILS)) notFound();
  return <HeuteDetail k={wert as DetailKey} day={tag} />;
}
