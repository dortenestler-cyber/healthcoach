import type { Metadata } from "next";
import SportSeite from "@/components/training/SportSeite";

export const metadata: Metadata = { title: "Kettlebell · Training · Health Coach" };

export default function Page() {
  return <SportSeite slug="kettlebell" />;
}
