import type { ReactNode } from "react";
import { ValueRing } from "@/components/charts";

// Zielkarte für alle Sportarten (Konzept docs/konzept-einfach.md, Paket 9, Rahmen C):
// Ziel und Zeit oben, Ring „x von y“ mit Wort, ein Satz, was noch fehlt. Darunter Platz für Aktionen.
export default function Zielkarte({
  ziel,
  zeit,
  zeitNote,
  anteil,
  mitte,
  wort,
  satz,
  children,
}: {
  ziel: string; // z. B. „Prüfung zum 5. Kyu · blauer Gürtel“
  zeit: string; // große Zeile, z. B. „noch 4 Wochen“
  zeitNote?: string; // z. B. Datum
  anteil: number; // 0–1
  mitte: string; // z. B. „12/31“
  wort: string; // z. B. „sitzen“
  satz: string;
  children?: ReactNode;
}) {
  return (
    <section className="card zielkarte" aria-label={ziel}>
      <span className="meta">{ziel}</span>
      <div className="zielkarte-kopf">
        <ValueRing tone="training" size={96} value={anteil} center={mitte} caption={wort} label={`${mitte.replace("/", " von ")} ${wort}`} />
        <div className="stack">
          <span className="big-number">{zeit}</span>
          {zeitNote && <span className="meta">{zeitNote}</span>}
          <span className="zielkarte-satz">{satz}</span>
        </div>
      </div>
      {children}
    </section>
  );
}
