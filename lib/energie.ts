// Energie über den Tag (Body Battery) für die Seite Heute.
// Reine Berechnungen ohne Netzwerk. Zusammenhänge aus den eigenen Daten, keine Empfehlungen.

import type { Activity, Daily } from "@/lib/garmin";

export const SLOTS = 96; // alle 15 Minuten

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------- Energie über den Tag

export type EnergyDay = {
  today: (number | null)[]; // heutige Werte bis jetzt
  usual: (number | null)[]; // Median je Zeitfenster der letzten 30 Tage (ohne heute), ab 7 Tagen je Fenster
  projection: (number | null)[]; // Hochrechnung ab jetzt bis Mitternacht entlang des üblichen Verlaufs
  nowSlot: number;
  usualDays: number;
  sleep: { start: number; end: number } | null; // letzte Nacht in Minuten (Start ggf. am Vortag, dann negativ)
  training: { start: number; end: number; label: string }[]; // heute, Minuten seit Mitternacht
};

export function energyDay(day: string, daily: Daily[], acts: Activity[], nowMinute: number): EnergyDay {
  const nowSlot = Math.min(SLOTS - 1, Math.floor(nowMinute / 15));
  const row = daily.find((d) => d.day === day);
  const today = Array.from({ length: SLOTS }, (_, i) => (i <= nowSlot ? (row?.bb_curve?.[i] ?? null) : null));
  const past = daily.filter((d) => d.day < day && d.day >= addDays(day, -30) && Array.isArray(d.bb_curve));
  const usual = Array.from({ length: SLOTS }, (_, i) => {
    const v = past.map((d) => d.bb_curve![i]).filter((x): x is number => typeof x === "number");
    return v.length >= 7 ? median(v) : null;
  });
  // Hochrechnung: vom letzten heutigen Wert aus die Veränderung des üblichen Tages übernehmen
  const lastIdx = [...today.keys()].reverse().find((i) => today[i] !== null);
  const projection: (number | null)[] = Array(SLOTS).fill(null);
  if (lastIdx !== undefined && usual[lastIdx] !== null) {
    projection[lastIdx] = today[lastIdx];
    for (let i = lastIdx + 1; i < SLOTS; i++) {
      if (usual[i] === null) break;
      projection[i] = Math.max(0, Math.min(100, (today[lastIdx] as number) + ((usual[i] as number) - (usual[lastIdx] as number))));
    }
  }
  const sleep = row && typeof row.sleep_end_min === "number" && typeof row.sleep_start_min === "number"
    ? { start: row.sleep_start_min > row.sleep_end_min ? row.sleep_start_min - 1440 : row.sleep_start_min, end: row.sleep_end_min }
    : null;
  const training = acts
    .filter((a) => (a.start_local ?? "").slice(0, 10) === day && a.start_local)
    .map((a) => {
      const t = (a.start_local as string).slice(11, 16).split(":").map(Number);
      const start = t[0] * 60 + (t[1] || 0);
      return { start, end: Math.min(1440, start + Math.round((a.duration_s ?? 1800) / 60)), label: a.name ?? "Training" };
    });
  return { today, usual, projection, nowSlot, usualDays: past.length, sleep, training };
}

// Tagesrhythmus aus deinem üblichen Tag: wann die Energie meist am höchsten ist und wann sie am stärksten sinkt.
// Zwei-Stunden-Fenster zwischen 6 und 22 Uhr. Ein Muster aus deinen Daten, keine Vorhersage für einzelne Tage.
export function usualRhythm(usual: (number | null)[]): { peak: [number, number]; drain: [number, number] | null } | null {
  const WIN = 8;
  let peak: { at: number; v: number } | null = null;
  let drain: { at: number; d: number } | null = null;
  for (let i = 24; i + WIN <= 88; i += 4) {
    const w = usual.slice(i, i + WIN);
    if (w.some((x) => x === null)) continue;
    const vals = w as number[];
    const m = vals.reduce((a, b) => a + b, 0) / WIN;
    if (!peak || m > peak.v) peak = { at: i, v: m };
    const d = vals[0] - vals[WIN - 1];
    if (d > 0 && (!drain || d > drain.d)) drain = { at: i, d };
  }
  if (!peak) return null;
  const h = (slot: number) => Math.round(slot / 4);
  return { peak: [h(peak.at), h(peak.at + WIN)], drain: drain && drain.d >= 5 ? [h(drain.at), h(drain.at + WIN)] : null };
}
