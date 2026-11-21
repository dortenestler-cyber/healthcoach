import type { Metadata } from "next";
import SettingsView from "@/components/SettingsView";

export const metadata: Metadata = { title: "Einstellungen · Health Coach" };

export default function EinstellungenPage() {
  return <SettingsView />;
}
