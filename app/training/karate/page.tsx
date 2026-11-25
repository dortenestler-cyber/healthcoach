import type { Metadata } from "next";
import SportSeite from "@/components/training/SportSeite";

export const metadata: Metadata = { title: "Karate · Training · Health Coach" };

export default function Page() {
  return <SportSeite slug="karate" />;
}
