"use client";

import { useSyncExternalStore } from "react";

// Bildschirmbreiten (Konzept Web-App): bis 767 iPhone, 768–1023 iPad hochkant, ab 1024 iPad quer und Computer.
export const BP_TABLET = 768;
export const BP_WIDE = 1024;

function subscribeMq(q: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(q);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

export function useMedia(q: string): boolean {
  return useSyncExternalStore(subscribeMq(q), () => window.matchMedia(q).matches, () => false);
}

// Ab 1024 px: zwei Spalten und Coach-Spalte
export const useWide = () => useMedia(`(min-width: ${BP_WIDE}px)`);
// Ab 768 px: Seitenleiste statt Leiste unten
export const useTablet = () => useMedia(`(min-width: ${BP_TABLET}px)`);

// Coach-Spalte am Computer: offen oder eingeklappt (merkt sich der Browser). Auf dem iPad hochkant: Fenster von rechts, startet zu.
const KEY = "hc_coach_panel";
const listeners = new Set<() => void>();
let overlayOpen = false;

function readDocked(): boolean {
  try {
    return localStorage.getItem(KEY) !== "zu";
  } catch {
    return true;
  }
}

export const coachPanel = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  docked: readDockedSafe,
  overlay: () => overlayOpen,
  setDocked(open: boolean) {
    try {
      localStorage.setItem(KEY, open ? "offen" : "zu");
    } catch {
      // nur Komfort
    }
    listeners.forEach((l) => l());
  },
  setOverlay(open: boolean) {
    overlayOpen = open;
    listeners.forEach((l) => l());
  },
};

function readDockedSafe(): boolean {
  return typeof window === "undefined" ? true : readDocked();
}

export function useCoachPanel(): { docked: boolean; overlay: boolean } {
  const docked = useSyncExternalStore(coachPanel.subscribe, coachPanel.docked, () => true);
  const overlay = useSyncExternalStore(coachPanel.subscribe, coachPanel.overlay, () => false);
  return { docked, overlay };
}
