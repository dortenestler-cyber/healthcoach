import type { Metadata } from "next";
import UsageView from "@/components/settings/UsageView";

export const metadata: Metadata = { title: "Nutzung · Health Coach" };

export default function Page() {
  return <UsageView />;
}
