import type { Metadata } from "next";
import CheckView from "@/components/settings/CheckView";

export const metadata: Metadata = { title: "Einrichtungs-Check · Health Coach" };

export default function Page() {
  return <CheckView />;
}
