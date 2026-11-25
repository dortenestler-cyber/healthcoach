// „Heute üben“ und „Was saß heute?“ (Konzept docs/konzept-einfach.md, Paket 9, Abschnitt H).
// Die App wählt 3–5 Punkte für den nächsten Kyu: zuerst „übe ich“, dann „offen“; was lange nicht dran war, zuerst.
// Bei einer Verletzung kein Kumite. Begriffe zählen nicht. Gemerkt in settings.data.karate (keine Migration):
// zuletzt[key] = Tag, an dem der Punkt zuletzt dran war; ueben = { tag, keys } die Auswahl des Tages.

import { grad, stand, type Punkt, type Status } from "@/lib/karate/programm";

export type KarateMerk = {
  ziel?: number;
  pruefungen?: Record<string, { datum?: string; bestanden?: string }>;
  zuletzt?: Record<string, string>;
  ueben?: { tag: string; keys: string[] };
};

export const ANZAHL = 4;

export function waehleUeben(kyu: number, progress: Map<string, Status>, zuletzt: Record<string, string>, verletzt: boolean): Punkt[] {
  const rang = (s: Status) => (s === "uebe" ? 0 : s === "offen" ? 1 : 2);
  return grad(kyu)
    .punkte.filter((p) => p.gruppe !== "Begriffe" && !(verletzt && p.gruppe === "Kumite"))
    .map((p) => ({ p, s: stand(p, progress) }))
    .filter((x) => x.s !== "sitzt")
    .sort((a, b) => rang(a.s) - rang(b.s) || (zuletzt[a.p.key] ?? "").localeCompare(zuletzt[b.p.key] ?? "") || Number(!!a.p.wiederholung) - Number(!!b.p.wiederholung))
    .slice(0, ANZAHL)
    .map((x) => x.p);
}

// Auswahl für einen Tag: gespeicherte nehmen, sonst neu wählen (und zurückgeben, ob sie neu ist)
export function uebenFuer(tag: string, merk: KarateMerk, progress: Map<string, Status>, verletzt: boolean): { punkte: Punkt[]; neu: boolean } {
  const kyu = Math.max(merk.ziel ?? 5, 1);
  const alle = grad(kyu).punkte;
  if (merk.ueben?.tag === tag) {
    const punkte = merk.ueben.keys.map((k) => alle.find((p) => p.key === k)).filter((p): p is Punkt => !!p);
    if (punkte.length) return { punkte, neu: false };
  }
  return { punkte: waehleUeben(kyu, progress, merk.zuletzt ?? {}, verletzt), neu: true };
}

// Fortschritt für den Kyu: Punkte ohne Begriffe und ohne Wiederholung, dazu eigene Punkte (wie der Ring auf der Karate-Seite)
export function fortschritt(kyu: number, progress: Map<string, Status>, eigene: { kyu: number | null; status: Status }[]): { sitzt: number; total: number } {
  const haupt = grad(kyu).punkte.filter((p) => !p.wiederholung && p.gruppe !== "Begriffe");
  const eig = eigene.filter((i) => (i.kyu ?? 5) === kyu);
  return {
    sitzt: haupt.filter((p) => stand(p, progress) === "sitzt").length + eig.filter((i) => i.status === "sitzt").length,
    total: haupt.length + eig.length,
  };
}
