"use client";

import { useEffect, useState } from "react";

// Einstellungen, die nur auf diesem Gerät gelten (localStorage).
// Gesundheitsdaten liegen weiter in Supabase, hier stehen nur Schalter.

const EVENT = "hc-prefs";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder gesperrt: Schalter gilt dann nur bis zum Neuladen
  }
  window.dispatchEvent(new Event(EVENT));
}

// Liest einen Wert und aktualisiert ihn, sobald er irgendwo geändert wird
function usePref<T>(get: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const update = () => setValue(get());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
    // get ist stabil (Modulfunktion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/* Darstellung: immer dunkel (docs/farb-und-designkonzept.md), keine Wahl mehr. */

/* ---------- Funktionen ein- und ausblenden ---------- */

export type Feature =
  | "zyklus"
  | "perimenopause"
  | "muskeln"
  | "medikamente"
  | "krankheit"
  | "verletzung"
  | "kettlebell"
  | "bouldern"
  | "karate"
  | "garmin"
  | "tagesziel"
  | "tagesplan";

export const FEATURES: { key: Feature; label: string; note: string }[] = [
  { key: "zyklus", label: "Zyklus", note: "Zyklusphasen im HRV-Verlauf auf Heute" },
  { key: "perimenopause", label: "Perimenopause", note: "Symptome und Hitzewallungen auf Heute" },
  { key: "muskeln", label: "Wadenkrämpfe", note: "Zucken und Krämpfe im Tagebuch" },
  { key: "medikamente", label: "Medikamente", note: "Bereich unter Gesundheit" },
  { key: "krankheit", label: "Krankheit", note: "Bereich unter Gesundheit" },
  { key: "verletzung", label: "Verletzung", note: "Bereich unter Gesundheit" },
  { key: "kettlebell", label: "Kettlebell", note: "Bereich unter Training" },
  { key: "bouldern", label: "Bouldern", note: "Bereich unter Training" },
  { key: "karate", label: "Karate", note: "Bereich unter Training" },
  { key: "garmin", label: "Garmin-Karten", note: "Schlaf und Vitalwerte auf Heute" },
  { key: "tagesziel", label: "Tagesziel", note: "Belastungsring auf Heute, Tagesziel unter Training › Auswertung" },
  { key: "tagesplan", label: "Tagesplan", note: "Plan für heute auf Heute" },
];

export type Profile = "einfach" | "standard" | "alles";
export const PROFILES: { key: Profile; label: string; note: string; on: Feature[] }[] = [
  { key: "einfach", label: "Einfach", note: "Check-in, Readiness, Garmin, Kalender", on: ["garmin", "krankheit"] },
  {
    key: "standard",
    label: "Standard",
    note: "Dazu Zyklus, Perimenopause, Medikamente und Sportarten",
    on: ["zyklus", "perimenopause", "muskeln", "medikamente", "krankheit", "verletzung", "kettlebell", "bouldern", "karate", "garmin", "tagesziel"],
  },
  { key: "alles", label: "Alles", note: "Alle Bereiche", on: FEATURES.map((f) => f.key) },
];

const FEAT_KEY = "hc_features";
type FeatureState = Record<Feature, boolean>;
const ALL_ON = Object.fromEntries(FEATURES.map((f) => [f.key, true])) as FeatureState;

export function getFeatures(): FeatureState {
  return readJson<FeatureState>(FEAT_KEY, ALL_ON);
}

export function setFeature(key: Feature, on: boolean): void {
  writeJson(FEAT_KEY, { ...getFeatures(), [key]: on });
}

export function applyProfile(p: Profile): void {
  const on = PROFILES.find((x) => x.key === p)?.on ?? [];
  writeJson(FEAT_KEY, Object.fromEntries(FEATURES.map((f) => [f.key, on.includes(f.key)])));
}

// Welches Profil passt genau zur aktuellen Auswahl? Sonst „Eigene Auswahl“.
export function currentProfile(f: FeatureState): Profile | null {
  return PROFILES.find((p) => FEATURES.every((x) => f[x.key] === p.on.includes(x.key)))?.key ?? null;
}

export const useFeatures = () => usePref<FeatureState>(getFeatures, ALL_ON);

/* ---------- Coach ---------- */

export type CoachPrefs = { on: boolean; dailyLimit: number };
const COACH_KEY = "hc_coach";
export const COACH_DEFAULT: CoachPrefs = { on: true, dailyLimit: 10 };
export const COACH_LIMITS = [5, 10, 20, 40]; // 40 ist die Obergrenze in der Funktion „coach“

export function getCoachPrefs(): CoachPrefs {
  return readJson<CoachPrefs>(COACH_KEY, COACH_DEFAULT);
}

export function setCoachPrefs(p: Partial<CoachPrefs>): void {
  writeJson(COACH_KEY, { ...getCoachPrefs(), ...p });
}

export const useCoachPrefs = () => usePref<CoachPrefs>(getCoachPrefs, COACH_DEFAULT);

/* ---------- Nutzung (nur Zähler, keine Inhalte) ---------- */

const USAGE_KEY = "hc_usage";
export type Usage = Record<string, { n: number; last: string }>;

export function getUsage(): Usage {
  return readJson<Usage>(USAGE_KEY, {});
}

export function trackUse(area: string): void {
  const u = getUsage();
  const prev = u[area] ?? { n: 0, last: "" };
  u[area] = { n: prev.n + 1, last: new Date().toISOString() };
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch {
    // nichts zu tun
  }
}

export function clearUsage(): void {
  writeJson(USAGE_KEY, {});
}
