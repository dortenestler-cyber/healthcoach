import type { Metadata } from "next";
import TagebuchView from "@/components/TagebuchView";

export const metadata: Metadata = { title: "Tagebuch · Health Coach" };

// ?tag=JJJJ-MM-TT öffnet einen vergangenen Tag zum Nachtragen
export default async function TagebuchPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  return <TagebuchView initial={tag} />;
}
