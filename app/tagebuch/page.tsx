import type { Metadata } from "next";
import TagebuchView from "@/components/TagebuchView";

export const metadata: Metadata = { title: "Tagebuch · Health Coach" };

export default function TagebuchPage() {
  return <TagebuchView />;
}
