// Cardio-Fokus: Belastung der letzten 4 Wochen nach Art (Prüfaudit 26.11., Empfehlung 12, nach Garmin Training Load Focus).
// Jede Einheit verteilt ihre Garmin-Last nach den Minuten je Pulszone: Zone 0–2 locker aerob, Zone 3–4 intensiv aerob, Zone 5 anaerob.
// Grenzen sind Startwerte: locker unter 30 %, intensiv unter 20 % oder anaerob unter 5 % gilt als Mangel, ein Anteil über 60 % als Schwerpunkt.
// Reine Berechnung ohne Netzwerk.

import type { Data } from "@/lib/insights";

export type FokusArt = "locker" | "intensiv" | "anaerob";
export const FOKUS_NAMEN: Record<FokusArt, string> = { locker: "Locker aerob", intensiv: "Intensiv aerob", anaerob: "Anaerob" };
export const FOKUS_REIHE: FokusArt[] = ["locker", "intensiv", "anaerob"];
export const FOKUS_TAGE = 28;
const MANGEL: Record<FokusArt, number> = { locker: 0.3, intensiv: 0.2, anaerob: 0.05 };
const SCHWERPUNKT = 0.6;
const MIN_LAST = 100; // darunter keine Einordnung

export type CardioFokus = {
  last: Record<FokusArt, number>;
  anteil: Record<FokusArt, number>;
  gesamt: number;
  mangel: FokusArt[];
  schwerpunkt: FokusArt | null;
  einheiten: number; // Einheiten mit Pulszonen
};

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function cardioFokus(today: string, data: Data): CardioFokus {
  const from = addDays(today, -(FOKUS_TAGE - 1));
  const last: Record<FokusArt, number> = { locker: 0, intensiv: 0, anaerob: 0 };
  let einheiten = 0;
  for (const a of data.acts) {
    const d = (a.start_local ?? "").slice(0, 10);
    const z = a.hr_zones;
    if (d < from || d > today || !Array.isArray(z) || !(a.training_load ?? 0)) continue;
    const m = z.map((v) => Number(v) || 0);
    const sum = m.reduce((s, v) => s + v, 0);
    if (sum <= 0) continue;
    einheiten++;
    const tl = a.training_load ?? 0;
    last.locker += (tl * ((m[0] ?? 0) + (m[1] ?? 0) + (m[2] ?? 0))) / sum;
    last.intensiv += (tl * ((m[3] ?? 0) + (m[4] ?? 0))) / sum;
    last.anaerob += (tl * (m[5] ?? 0)) / sum;
  }
  const gesamt = last.locker + last.intensiv + last.anaerob;
  const anteil = { locker: 0, intensiv: 0, anaerob: 0 } as Record<FokusArt, number>;
  for (const k of FOKUS_REIHE) anteil[k] = gesamt > 0 ? last[k] / gesamt : 0;
  const ready = gesamt >= MIN_LAST;
  const mangel = ready ? FOKUS_REIHE.filter((k) => anteil[k] < MANGEL[k]) : [];
  const schwerpunkt = ready ? (FOKUS_REIHE.find((k) => anteil[k] > SCHWERPUNKT) ?? null) : null;
  return { last, anteil, gesamt, mangel, schwerpunkt, einheiten };
}

// Ein Satz zum Ergebnis (Überschrift der Karte)
export function fokusSatz(f: CardioFokus): string {
  if (f.gesamt < MIN_LAST) return "Für den Cardio-Fokus fehlen noch Einheiten mit Pulszonen.";
  const w = (k: FokusArt) => FOKUS_NAMEN[k].toLowerCase();
  if (f.mangel.length) return `Zu wenig ${f.mangel.map(w).join(" und ")} in den letzten 4 Wochen.`;
  if (f.schwerpunkt) return `Schwerpunkt ${w(f.schwerpunkt)}, die anderen Arten sind ausreichend dabei.`;
  return "Ausgewogen: alle drei Arten sind in den letzten 4 Wochen dabei.";
}
