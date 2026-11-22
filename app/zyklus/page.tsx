import type { Metadata } from "next";
import ZyklusPage from "@/components/zyklus/ZyklusPage";

export const metadata: Metadata = { title: "Zyklus · Health Coach" };

export default function Page() {
  return <ZyklusPage />;
}
