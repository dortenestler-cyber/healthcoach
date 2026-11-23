"use client";

// Echte Breite eines Charts messen (Sammelliste Punkt 15)
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { W } from "@/components/charts/scale";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Echte Breite eines Elements in px, folgt Größenänderungen. Bis zum Messen W.
export function useChartWidth<T extends Element = SVGSVGElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(W);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const v = Math.round(el.getBoundingClientRect().width);
      if (v > 0) setW((old) => (Math.abs(old - v) >= 1 ? v : old));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

