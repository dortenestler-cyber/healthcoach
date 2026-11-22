import type { Metadata } from "next";
import HabitDetail from "@/components/gesundheit/HabitDetail";

export const metadata: Metadata = { title: "Gewohnheit · Health Coach" };

export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k } = await searchParams;
  return <HabitDetail habitKey={k ?? "sauna"} />;
}
