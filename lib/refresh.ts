"use client";

// Daten regelmäßig aktualisieren (docs/konzept-datenaktualisierung.md, Teil A).
// Neu laden aus der eigenen Datenbank ist billig und passiert:
//  A1 wenn die App wieder sichtbar wird und das letzte Laden mindestens 5 Minuten her ist,
//  A3 alle 15 Minuten, solange die App sichtbar ist,
//  A5 beim Tageswechsel,
//  und sofort, wenn irgendwo neue Daten angekommen sind (announceNewData, z. B. nach einem Garmin-Abruf).
// Statt eines zentralen Datenspeichers (A6) melden sich die Seiten mit ihrer Ladefunktion hier an.

import { useEffect, useRef, useState } from "react";
import { isoDay } from "@/lib/dates";

export const REFRESH_EVENT = "hc-daten-neu";
export const VISIBLE_AFTER_MS = 5 * 60 * 1000;
export const POLL_MS = 15 * 60 * 1000;

export function announceNewData(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

export function useRefresh(load: () => void, enabled = true): void {
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    let day = isoDay();
    const run = () => {
      last = Date.now();
      day = isoDay();
      loadRef.current();
    };
    const onVisible = () => {
      if (visible() && (Date.now() - last >= VISIBLE_AFTER_MS || isoDay() !== day)) run();
    };
    const tick = () => {
      if (visible() && (Date.now() - last >= POLL_MS || isoDay() !== day)) run();
    };
    const t = window.setInterval(tick, 60 * 1000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(REFRESH_EVENT, run);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(REFRESH_EVENT, run);
    };
  }, [enabled]);
}

// Heutiger Tag, wechselt um Mitternacht und beim Zurückkehren in die App (A5)
export function useToday(): string {
  const [today, setToday] = useState(isoDay());
  useEffect(() => {
    const check = () => setToday((t) => (isoDay() !== t ? isoDay() : t));
    const t = window.setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return today;
}
