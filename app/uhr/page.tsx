import type { Metadata } from "next";
import UhrView from "@/components/UhrView";

export const metadata: Metadata = { title: "Uhr verbinden · Health Coach" };

export default function UhrPage() {
  return <UhrView />;
}
