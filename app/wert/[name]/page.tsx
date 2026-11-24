import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeuteDetail from "@/components/heute/HeuteDetail";
import HabitDetail from "@/components/gesundheit/HabitDetail";
import VerlaufView from "@/components/VerlaufView";
import { DETAILS, type DetailKey } from "@/lib/heuteDetails";
import { METRICS } from "@/lib/garmin";

export const metadata: Metadata = { title: "Wert · Health Coach" };

// Wert-Seite (Konzept docs/konzept-buendeln.md, Baustein 3): eine Adresse für jeden Wert.
// /wert/readiness, /wert/schlaf, /wert/belastung, /wert/stress, /wert/energie, /wert/intensitaet: Seite mit Ring,
//   bei Schlaf, Stress und Belastung darunter der Verlauf mit Zeitraum und „Dieser Monat“.
// /wert/hrv, /wert/ruhepuls … (alle Werte aus lib/garmin.ts METRICS): Verlauf mit Zeitraum, Bereich, Zyklusphase, „Dieser Monat“.
// /wert/gewohnheit-<key>: Gewohnheit.
// Alte Adressen /heute/<wert>, /verlauf?m=<wert> und /gesundheit/gewohnheit?k=<key> leiten hierher.
const MIT_VERLAUF: Partial<Record<DetailKey, keyof typeof METRICS>> = { schlaf: "schlaf", stress: "stress", belastung: "belastung" };

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<{ tag?: string }> }) {
  const { name } = await params;
  const { tag } = await searchParams;
  if (name.startsWith("gewohnheit-")) return <HabitDetail habitKey={name.slice("gewohnheit-".length)} />;
  if (name in DETAILS) {
    const m = MIT_VERLAUF[name as DetailKey];
    return (
      <>
        <HeuteDetail k={name as DetailKey} day={tag} />
        {m && <VerlaufView initial={m} mode="eingebettet" />}
      </>
    );
  }
  if (name in METRICS) return <VerlaufView initial={name} mode="wert" />;
  notFound();
}
