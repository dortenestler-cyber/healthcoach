import type { Metadata } from "next";
import TagebuchView from "@/components/TagebuchView";

export const metadata: Metadata = { title: "Tagebuch · Health Coach" };

// ?tag=JJJJ-MM-TT öffnet einen vergangenen Tag zum Nachtragen, ?abschluss=1 den Tagesabschluss (Mitteilung am Abend)
export default async function TagebuchPage({ searchParams }: { searchParams: Promise<{ tag?: string; abschluss?: string }> }) {
  const { tag, abschluss } = await searchParams;
  return <TagebuchView initial={tag} abschluss={abschluss === "1"} />;
}
