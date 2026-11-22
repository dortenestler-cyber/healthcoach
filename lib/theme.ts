"use client";

// Darstellung: Automatisch (wie das Gerät), Hell oder Dunkel. Gespeichert nur auf diesem Gerät.
export type Theme = "auto" | "light" | "dark";

export const THEME_KEY = "hc_theme";

export const THEME_OPTIONS: [Theme, string][] = [
  ["auto", "Automatisch"],
  ["light", "Hell"],
  ["dark", "Dunkel"],
];

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === "auto") delete root.dataset.theme;
  else root.dataset.theme = t;
}

export function setTheme(t: Theme): void {
  try {
    if (t === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // nichts zu tun
  }
  applyTheme(t);
}
