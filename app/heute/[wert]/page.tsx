import { redirect } from "next/navigation";

// Alte Adresse: die Detailseiten liegen jetzt unter /wert/<wert> (Konzept Bündeln, Baustein 3)
export default async function Page({ params, searchParams }: { params: Promise<{ wert: string }>; searchParams: Promise<{ tag?: string }> }) {
  const { wert } = await params;
  const { tag } = await searchParams;
  redirect(`/wert/${wert}${tag ? `?tag=${tag}` : ""}`);
}
