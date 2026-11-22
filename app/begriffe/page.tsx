import type { Metadata } from "next";
import BegriffeView from "@/components/BegriffeView";

export const metadata: Metadata = { title: "Begriffe · Health Coach" };

export default function BegriffePage() {
  return <BegriffeView />;
}
