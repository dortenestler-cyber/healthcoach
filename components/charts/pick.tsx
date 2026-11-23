"use client";

// Antippen oder Überfahren eines Charts (Sammelliste Punkt 9): markiert den nächsten Tag und zeigt ein Schild mit Datum und Wert.
// Maus: folgt dem Zeiger, verschwindet beim Verlassen. Finger: Tippen setzt, verschwindet nach ein paar Sekunden oder beim Tippen daneben.
// Tastatur: Chart fokussieren, ← → wechseln den Tag, Esc schließt.

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { W } from "@/components/charts/scale";

const HIDE_AFTER_MS = 4000;

export function usePick(n: number, x0: number, step: number) {
  const [sel, setSel] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const indexAt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((vx - x0) / step)));
  };
  const hideLater = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSel(null), HIDE_AFTER_MS);
  };

  const handlers = {
    tabIndex: 0,
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "mouse") setSel(indexAt(e));
    },
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      setSel(indexAt(e));
      if (e.pointerType !== "mouse") hideLater();
    },
    onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "mouse") setSel(null);
    },
    onBlur: () => setSel(null),
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const d = e.key === "ArrowLeft" ? -1 : 1;
        setSel((s) => Math.max(0, Math.min(n - 1, (s ?? n - 1) + (s === null ? 0 : d))));
      } else if (e.key === "Escape") setSel(null);
    },
  };
  return { sel, setSel, handlers };
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function tipDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${WEEKDAY[d.getDay()]}, ${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`;
}

// Schild oben im Chart, mittig über x, am Rand eingerückt. Zeile 1 kräftig, Zeile 2 gedämpft.
export function ChartTip({ x, lines, top = 2 }: { x: number; lines: string[]; top?: number }) {
  const [a, b] = lines;
  const w = Math.max(a.length * 6.6, (b ?? "").length * 5.6) + 18;
  const h = b ? 34 : 22;
  const left = Math.max(1, Math.min(W - w - 1, x - w / 2));
  return (
    <g className="cb-tip" aria-hidden="true" pointerEvents="none">
      <rect x={left} y={top} width={w} height={h} rx={8} className="cb-tip-box" />
      <text x={left + 9} y={top + 15} className="cb-tip-main">{a}</text>
      {b && <text x={left + 9} y={top + 28} className="cb-tip-sub">{b}</text>}
    </g>
  );
}
