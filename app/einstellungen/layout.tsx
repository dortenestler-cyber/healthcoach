import type { ReactNode } from "react";

// Einstellungen bleiben am Computer eine schmale Spalte (Konzept Web-App): Formulare lesen sich breit schlecht.
export default function EinstellungenLayout({ children }: { children: ReactNode }) {
  return <div className="narrow-page">{children}</div>;
}
