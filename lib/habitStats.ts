// Auswertung der Gewohnheiten: die Nacht danach mit und ohne, je Zyklusphase, Häufigkeit.
// Reine Berechnungen ohne Netzwerk. Zusammenhänge aus den eigenen Daten, keine Ursachen, keine Empfehlungen.
// Garmin ordnet eine Nacht dem Aufwachtag zu: Gewohnheit am Tag X → Nacht danach = Werte von Tag X+1.

import { cycleToday, groupOf, type PhaseGroup } from "@/lib/cycle";
import type { Daily } from "@/lib/garmin";
import type { Data, Diary } from "@/lib/insights";
import { sleepScores } from "@/lib/schlaf";

export const MIN_NIGHTS = 5;

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// Tage mit und ohne Gewohnheit. „Ohne“ sind nur Tage mit eigenem Tagebuch-Eintrag, damit fehlende Einträge nicht als „nein“ zählen
// (Tage nur aus Garmin, garminOnly, zählen nicht als „ohne“).
export function splitDays(diary: Diary[], key: string, from?: string): { withD: string[]; withoutD: string[] } {
  const rows = from ? diary.filter((d) => d.day >= from) : diary;
  const withD = rows.filter((d) => d.influences?.includes(key)).map((d) => d.day);
  const set = new Set(withD);
  return { withD, withoutD: rows.filter((d) => !d.garminOnly).map((d) => d.day).filter((d) => !set.has(d)) };
}

export type Compare = { with: number | null; without: number | null; nWith: number; nWithout: number; diff: number | null };

function compare(withD: string[], withoutD: string[], value: (day: string) => number | null): Compare {
  const a = withD.map((d) => value(addDays(d, 1))).filter((x): x is number => x !== null);
  const b = withoutD.map((d) => value(addDays(d, 1))).filter((x): x is number => x !== null);
  const ma = mean(a);
  const mb = mean(b);
  const ok = a.length >= MIN_NIGHTS && b.length >= MIN_NIGHTS;
  return { with: ok ? ma : null, without: ok ? mb : null, nWith: a.length, nWithout: b.length, diff: ok && ma !== null && mb !== null ? ma - mb : null };
}

export type NightRow = { key: string; label: string; c: Compare; fmt: (v: number) => string; unit: string; higherIsBetter: boolean | null };

const de = (v: number, d = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const hm = (h: number) => {
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} h`;
};

// Die Nacht danach: Schlafwert, HRV, Ruhepuls, Tiefschlaf, Nachtschweiß
export function nightAfter(data: Data, key: string, from?: string): NightRow[] {
  const { withD, withoutD } = splitDays(data.diary, key, from);
  const byDay = new Map<string, Daily>(data.daily.map((d) => [d.day, d]));
  const diaryBy = new Map(data.diary.map((d) => [d.day, d]));
  const get = (f: (d: Daily) => number | null | undefined) => (day: string) => {
    const r = byDay.get(day);
    const v = r ? f(r) : null;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const ss = sleepScores(data);
  return [
    { key: "schlafwert", label: "Schlafwert", c: compare(withD, withoutD, (day) => ss.get(day) ?? null), fmt: (v) => de(v), unit: "", higherIsBetter: true },
    { key: "hrv", label: "HRV", c: compare(withD, withoutD, get((d) => d.hrv_last_night)), fmt: (v) => `${de(v)} ms`, unit: "ms", higherIsBetter: true },
    { key: "ruhepuls", label: "Ruhepuls", c: compare(withD, withoutD, get((d) => d.resting_hr)), fmt: (v) => de(v), unit: "", higherIsBetter: false },
    { key: "tief", label: "Tiefschlaf", c: compare(withD, withoutD, get((d) => (d.sleep_deep_s ? d.sleep_deep_s / 3600 : null))), fmt: hm, unit: "h", higherIsBetter: true },
    {
      key: "nacht",
      label: "Nachtschweiß",
      // Anteil der Nächte mit Nachtschweiß (eingetragen am Morgen danach)
      c: compare(withD, withoutD, (day) => {
        const e = diaryBy.get(day);
        return e ? ((e.symptoms?.nacht ?? 0) > 0 ? 1 : 0) : null;
      }),
      fmt: (v) => `${de(v * 100)} %`,
      unit: "%",
      higherIsBetter: false,
    },
  ];
}

// HRV der Nacht danach über alle Tage, für „Was dir guttut“
export function hrvEffect(data: Data, key: string, from?: string): Compare {
  return nightAfter(data, key, from)[0].c;
}

export type PhaseEffectRow = { group: PhaseGroup; c: Compare };

// HRV-Unterschied je Zyklusphase (Phase am Tag der Gewohnheit)
export function hrvByPhase(data: Data, key: string, from?: string): PhaseEffectRow[] {
  const { withD, withoutD } = splitDays(data.diary, key, from);
  const hrv = new Map(data.daily.map((d) => [d.day, d.hrv_last_night]));
  const g = new Map<string, PhaseGroup | null>();
  const groupAt = (d: string) => {
    if (!g.has(d)) g.set(d, groupOf(cycleToday(d, data.diary).phase));
    return g.get(d)!;
  };
  const val = (d: string) => {
    const v = hrv.get(d);
    return typeof v === "number" ? v : null;
  };
  return (["menstruation", "follikel", "eisprung", "luteal"] as PhaseGroup[]).map((group) => ({
    group,
    c: compare(
      withD.filter((d) => groupAt(d) === group),
      withoutD.filter((d) => groupAt(d) === group),
      val,
    ),
  }));
}

// Hitzewallungen am Tag danach (Schnitt pro Tag), aus den Einträgen auf Heute
export function flashesNextDay(diary: Diary[], key: string, flashes: string[], from?: string): Compare {
  const perDay = new Map<string, number>();
  for (const at of flashes) {
    const d = new Date(at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const first = flashes.length ? flashes.map((f) => f.slice(0, 10)).sort()[0] : null;
  const { withD, withoutD } = splitDays(diary, key, from ?? first ?? undefined);
  return compare(withD, withoutD, (day) => perDay.get(day) ?? 0);
}

// Häufigkeit: dieser Monat, Vormonat, die letzten 4 Wochen, übliche Wochentage
const WD = ["sonntags", "montags", "dienstags", "mittwochs", "donnerstags", "freitags", "samstags"];
export function frequency(diary: Diary[], key: string, today: string) {
  const days = diary.filter((d) => d.influences?.includes(key)).map((d) => d.day);
  const ym = today.slice(0, 7);
  const prev = new Date(today.slice(0, 7) + "-15T12:00:00");
  prev.setMonth(prev.getMonth() - 1);
  const pym = prev.toISOString().slice(0, 7);
  const weeks = [3, 2, 1, 0].map((w) => days.filter((d) => d > addDays(today, -7 * (w + 1)) && d <= addDays(today, -7 * w)).length);
  const byWd = Array(7).fill(0);
  days.filter((d) => d > addDays(today, -90)).forEach((d) => byWd[new Date(d + "T12:00:00").getDay()]++);
  const top = byWd.map((n, i) => ({ n, i })).filter((x) => x.n >= 3).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => WD[x.i]);
  return { month: days.filter((d) => d.startsWith(ym)).length, prevMonth: days.filter((d) => d.startsWith(pym)).length, weeks, usual: top, days: new Set(days) };
}
