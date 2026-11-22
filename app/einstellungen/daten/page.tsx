import type { Metadata } from "next";
import DataView from "@/components/settings/DataView";

export const metadata: Metadata = { title: "Export & Backup · Health Coach" };

export default function Page() {
  return <DataView />;
}
