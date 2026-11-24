import type { Metadata } from "next";
import { redirect } from "next/navigation";
import VerlaufView from "@/components/VerlaufView";

export const metadata: Metadata = { title: "Verlauf · Health Coach" };

// Übersicht aller Werte. Ein einzelner Wert hat seine eigene Seite: /verlauf?m=<wert> leitet nach /wert/<wert>.
export default async function VerlaufPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  if (m) redirect(`/wert/${m}`);
  return <VerlaufView initial={null} />;
}
