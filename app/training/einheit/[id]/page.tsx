import type { Metadata } from "next";
import { notFound } from "next/navigation";
import UnitDetail from "@/components/training/UnitDetail";

export const metadata: Metadata = { title: "Einheit · Training · Health Coach" };

// Einheit im Detail: /training/einheit/<Garmin-Aktivitäts-ID>
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <UnitDetail id={id} />;
}
