import type { Metadata } from "next";
import CoachView from "@/components/CoachView";

export const metadata: Metadata = { title: "Coach · Health Coach" };

export default function CoachPage() {
  return <CoachView />;
}
