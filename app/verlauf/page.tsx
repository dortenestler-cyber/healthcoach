import type { Metadata } from "next";
import VerlaufView from "@/components/VerlaufView";

export const metadata: Metadata = { title: "Verlauf · Health Coach" };

export default async function VerlaufPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <VerlaufView initial={m ?? null} />;
}
