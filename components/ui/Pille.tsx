"use client";

import type { ReactNode } from "react";
import { useAnsicht } from "@/lib/ansicht";

// Ein Baustein für Pillen (Konzept docs/konzept-einfach.md, Paket 1):
// - Filter: an/aus, mehrere zugleich (Kalender-Ebenen, Sportarten)
// - Abschnitt: blendet einen Abschnitt einer langen Seite ein oder aus
// - Einblenden: „Details“ unter einer Karte, auf- und zuklappen
// Sichtbar 32–36 px hoch, Tap-Fläche 44 px. Aktiv: hell auf dunkel.

type PilleProps = {
  an: boolean;
  onClick: () => void;
  children: ReactNode;
  farbe?: string; // CSS-Variable der Farbfamilie, z. B. "var(--training)"; steht immer neben dem Wort
  art?: "filter" | "abschnitt";
  label?: string;
  disabled?: boolean;
};

export function Pille({ an, onClick, children, farbe, art = "filter", label, disabled }: PilleProps) {
  return (
    <button type="button" className={`pill pille pille-${art}`} aria-pressed={an} aria-label={label} onClick={onClick} disabled={disabled}>
      {farbe && <span className="pille-punkt" style={{ background: farbe }} aria-hidden="true" />}
      {children}
    </button>
  );
}

// Zeile mit Pillen. „scroll“ für eine Zeile zum Wischen, sonst umbrechen.
export function PillenZeile({ label, scroll, children, className = "" }: { label: string; scroll?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`pills ${scroll ? "scroll" : "wrap"} pillen-zeile ${className}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}

// Mehrfachauswahl, die sich die App merkt. key ist der Ort, z. B. "kalender.zyklus".
export function useAuswahl<K extends string>(key: string, start: K[]): [Set<K>, (k: K) => void] {
  const [liste, setListe] = useAnsicht<K[]>(key, start);
  const an = new Set(liste);
  const umschalten = (k: K) => {
    const next = new Set(an);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setListe([...next]);
  };
  return [an, umschalten];
}

// Abschnitte einer langen Seite ein- und ausblenden. Gibt die Pillen-Zeile und eine Prüfung je Abschnitt zurück.
export function useAbschnitte<K extends string>(key: string, abschnitte: [K, string][], start?: K[]) {
  const [an, umschalten] = useAuswahl<K>(`abschnitte.${key}`, start ?? abschnitte.map(([k]) => k));
  const zeile = (
    <PillenZeile label="Abschnitte ein- und ausblenden" scroll className="pillen-abschnitte">
      {abschnitte.map(([k, text]) => (
        <Pille key={k} art="abschnitt" an={an.has(k)} onClick={() => umschalten(k)}>
          {text}
        </Pille>
      ))}
    </PillenZeile>
  );
  // einschalten: z. B. wenn ein Link (#perioden) auf einen ausgeblendeten Abschnitt zeigt
  return { zeile, zeigt: (k: K) => an.has(k), einschalten: (k: K) => !an.has(k) && umschalten(k) };
}

// „Details“ unter einer Karte: zuerst zu, die Wahl bleibt gemerkt.
export function Details({ id, label = "Details", children, offen: startOffen = false }: { id: string; label?: string; children: ReactNode; offen?: boolean }) {
  const [offen, setOffen] = useAnsicht<boolean>(`details.${id}`, startOffen);
  return (
    <div className="pille-details">
      <button type="button" className="pille-einblenden" aria-expanded={offen} onClick={() => setOffen(!offen)}>
        <span>{label}</span>
        <span className="pille-pfeil" aria-hidden="true">⌄</span>
      </button>
      {offen && <div className="pille-inhalt">{children}</div>}
    </div>
  );
}
