import { redirect } from "next/navigation";

// Alte Adresse: Gewohnheiten haben ihre Seite jetzt unter /wert/gewohnheit-<key> (Konzept Bündeln, Baustein 3)
export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k } = await searchParams;
  redirect(`/wert/gewohnheit-${k ?? "sauna"}`);
}
