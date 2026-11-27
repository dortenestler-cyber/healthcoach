// Stimmung im Zyklus: Check-in-Stimmung (1 niedrig · 2 mittel · 3 gut) und Stimmungs-Symptome je Zyklusphase,
// dazu Gewohnheiten gegen die Stimmung am Tag danach. Reine Berechnungen ohne Netzwerk.
// Zusammenhänge aus den eigenen Daten, keine Ursachen. Erst ab MIN_DAYS Tagen je Seite eines Vergleichs.

import { INFLUENCES } from "@/lib/catalog";
import { cycleToday, groupOf, type PhaseGroup } from "@/lib/cycle";
import type { Data, Diary } from "@/lib/insights";

export const MIN_DAYS = 5;
export const MOOD_SYMPTOMS = ["stimmung", "reiz", "unruhe"]; // Stimmungstief, Reizbarkeit, Ängstlichkeit/innere Unruhe
export const GROUPS: PhaseGroup[] = ["menstruation", "follikel", "eisprung", "luteal"];
const MOOD_WORD = ["", "niedrig", "mittel", "gut"];
export const moodWord = (v: number) => MOOD_WORD[Math.min(3, Math.max(1, Math.round(v)))];

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// Phase je Tag nur einmal rechnen
function phaseLookup(diary: Diary[]) {
  const cache = new Map<string, PhaseGroup | null>();
  return (d: string) => {
    if (!cache.has(d)) cache.set(d, groupOf(cycleToday(d, diary).phase));
    return cache.get(d)!;
  };
}

const moodMap = (data: Data) => new Map(data.checkins.filter((c) => c.mood !== null).map((c) => [c.day, c.mood as number]));
// Tag mit belasteter Stimmung: mindestens eines der Stimmungs-Symptome mittel oder stärker
export const lowMoodDay = (e: Diary) => MOOD_SYMPTOMS.some((k) => (e.symptoms?.[k] ?? 0) >= 2);

export type MoodPhase = { group: PhaseGroup; mood: number | null; nMood: number; lowShare: number | null; nDiary: number };

// Stimmung je Phase: Schnitt des Check-ins und Anteil der Tage mit belasteter Stimmung (nur Tage mit eigenem Tagebuch-Eintrag)
export function moodByPhase(data: Data): MoodPhase[] {
  const g = phaseLookup(data.diary);
  const mm = moodMap(data);
  return GROUPS.map((group) => {
    const m = [...mm].filter(([d]) => g(d) === group).map(([, v]) => v);
    const e = data.diary.filter((x) => !x.garminOnly && g(x.day) === group);
    const low = e.filter(lowMoodDay).length;
    return {
      group,
      mood: m.length >= MIN_DAYS ? mean(m) : null,
      nMood: m.length,
      lowShare: e.length >= MIN_DAYS ? low / e.length : null,
      nDiary: e.length,
    };
  });
}

// Stimmung als gleitender 7-Tage-Schnitt der letzten `days` Tage, mit Phase je Tag
export function moodSeries(data: Data, today: string, days = 90): { days: string[]; values: (number | null)[]; phases: (PhaseGroup | null)[] } {
  const g = phaseLookup(data.diary);
  const mm = moodMap(data);
  const list = Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
  const values = list.map((d) => {
    const w = Array.from({ length: 7 }, (_, i) => mm.get(addDays(d, -i))).filter((x): x is number => x !== undefined);
    return w.length >= 3 ? (mean(w) as number) : null;
  });
  return { days: list, values, phases: list.map(g) };
}

export type MoodHabit = { key: string; label: string; byGroup: Record<PhaseGroup, { diff: number | null; nWith: number; nWithout: number }> };

// Stimmung am Tag nach der Gewohnheit (Check-in ist morgens), Tage mit gegen Tage ohne, getrennt nach Phase des Tages der Gewohnheit.
// „Ohne“ sind nur Tage mit eigenem Tagebuch-Eintrag.
export function moodByHabit(data: Data, keys?: { key: string; label: string }[], from?: string): MoodHabit[] {
  const g = phaseLookup(data.diary);
  const mm = moodMap(data);
  const rows = from ? data.diary.filter((d) => d.day >= from) : data.diary;
  const own = rows.filter((d) => !d.garminOnly);
  const list = keys ?? INFLUENCES;
  return list.map(({ key, label }) => {
    const withD = new Set(rows.filter((d) => d.influences?.includes(key)).map((d) => d.day));
    const withoutD = own.map((d) => d.day).filter((d) => !withD.has(d));
    const byGroup = {} as MoodHabit["byGroup"];
    for (const group of GROUPS) {
      const val = (days: Iterable<string>) => [...days].filter((d) => g(d) === group).map((d) => mm.get(addDays(d, 1))).filter((x): x is number => x !== undefined);
      const a = val(withD);
      const b = val(withoutD);
      const ok = a.length >= MIN_DAYS && b.length >= MIN_DAYS;
      byGroup[group] = { diff: ok ? (mean(a) as number) - (mean(b) as number) : null, nWith: a.length, nWithout: b.length };
    }
    return { key, label, byGroup };
  });
}

// Ein Satz zur Stimmung je Phase: größter Unterschied zwischen zwei Phasen, ab 0,3 Stufen
export function moodSentence(rows: MoodPhase[], label: (g: PhaseGroup) => string): string {
  const ready = rows.filter((r) => r.mood !== null);
  if (ready.length < 2) {
    const have = Math.max(0, ...rows.map((r) => r.nMood));
    return `Die Stimmung je Phase erscheint ab ${MIN_DAYS} Check-ins in zwei Phasen (bisher höchstens ${have} in einer).`;
  }
  const sorted = [...ready].sort((a, b) => (b.mood as number) - (a.mood as number));
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  const d = (hi.mood as number) - (lo.mood as number);
  const f = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (d < 0.3) return "Deine Stimmung liegt in allen Phasen etwa gleich.";
  return `Deine Stimmung ist in der ${label(lo.group)} im Schnitt niedriger (${f(lo.mood as number)} von 3) als in der ${label(hi.group)} (${f(hi.mood as number)}).`;
}
