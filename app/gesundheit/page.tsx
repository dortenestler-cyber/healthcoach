import type { Metadata } from "next";
import GesundheitView from "@/components/gesundheit/GesundheitView";

export const metadata: Metadata = { title: "Gesundheit · Health Coach" };

export default async function GesundheitPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <GesundheitView initial={t ?? "ueberblick"} />;
}
