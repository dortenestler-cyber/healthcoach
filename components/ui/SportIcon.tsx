import type { Sport } from "@/lib/training";

// Icons je Sportart (Konzept dunkel 2): Kettlebell, Gürtel mit Knoten, Berg mit Griff, Läuferin, Puls.
// Immer zusammen mit dem Namen der Sportart (sichtbar oder als Vorlesetext).
const PATHS: Record<Sport, string> = {
  kettlebell: "M9 7.5a3 3 0 0 1 6 0M8.5 8h7M18 14.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  karate: "M3 10h18M3 13.5h18M11 8.5h2a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1M11 15l-2 6M13 15l2 6",
  klettern: "M2.5 20l6.5-11 4 6 3-4 5.5 9zM10.5 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0",
  ausdauer: "M16.5 4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M7 21l3.5-6 3 2.5V21M5 12.5l3.5-4h5l3 3.5 2.5-1M10.5 15l2-6.5",
  sonstiges: "M3 12h4l2-5 4 10 2-5h6",
};

export default function SportIcon({ sport, size = 22 }: { sport: Sport; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[sport]} />
    </svg>
  );
}
