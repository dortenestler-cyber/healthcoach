// Inhalte zum persönlichen Bereich (Korridor) eines Werts: so oft im Bereich, Serie, wie schnell zurück,
// Verschiebung und Breite gegen vor 3 Monaten, Wochenende gegen Werktage und was vor ungünstigen Tagen oft war.
// Reine Berechnungen ohne Netzwerk. Alles sind Zusammenhänge, keine Ursachen und keine Diagnosen.

import { personalRange, positionIn, type Point, type Position, type Range } from "@/lib/baseline";
import type { Activity, Daily } from "@/lib/garmin";
import { bereichWort } from "@/lib/einordnung";
import { HARD_DAY_PCT, loadPercent, type Diary } from "@/lib/insights";
import { LEGACY_HABIT_KEYS } from "@/lib/catalog";

const SHARE_DAYS = 30; // „so oft im Bereich“
const LOOK_DAYS = 180; // Erholungszeit und „was davor war“
const SHIFT_DAYS = 90; // Vergleich mit vor 3 Monaten

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const width = (r: Range) => r.hi - r.lo || Math.max(1e-6, Math.abs(r.median) * 0.05);
const tageText = (n: number) => (n === 1 ? "einem Tag" : `${n} Tagen`);

export type KorridorInput = {
  series: Point[]; // alle geladenen Tage, ältester zuerst
  bands: Map<string, Range | null>; // Bereich, der an jedem Tag galt (wandernder Korridor)
  today: string;
  higherIsBetter: boolean;
  fmt: (v: number) => string;
  diary: Diary[];
  daily: Daily[];
  acts: Activity[];
  sick?: Set<string>;
  nightValue: boolean; // Wert der Nacht (dem Aufwachtag zugeordnet): „davor“ ist der Vortag
  habitLabel: (key: string) => string;
};

export type Line = { key: string; text: string };

type Rated = { day: string; value: number; pos: Position; bad: boolean };

// Jeder Tag mit Wert und Bereich, eingeordnet. bad: auf der ungünstigen Seite
function rate(inp: KorridorInput, from: string): Rated[] {
  return inp.series
    .filter((p) => p.day >= from && p.day <= inp.today && p.value !== null && inp.bands.get(p.day))
    .map((p) => {
      const pos = positionIn(p.value as number, inp.bands.get(p.day) as Range);
      return { day: p.day, value: p.value as number, pos, bad: inp.higherIsBetter ? pos === "unter" : pos === "über" };
    });
}

const posWord = (p: Position) => bereichWort(p);

// So oft im Bereich in den letzten 30 Tagen
function shareLine(inp: KorridorInput): Line | null {
  const r = rate(inp, addDays(inp.today, -(SHARE_DAYS - 1)));
  if (r.length < 7) return null;
  const c = { im: 0, unter: 0, über: 0 };
  for (const x of r) c[x.pos]++;
  const rest = [c.unter ? `an ${c.unter} darunter` : "", c.über ? `an ${c.über} darüber` : ""].filter(Boolean).join(", ");
  return { key: "share", text: `Letzte 30 Tage: an ${c.im} von ${r.length} Tagen im Bereich${rest ? `, ${rest}` : ""}.` };
}

// Serie: seit wie vielen Tagen mit Wert in derselben Lage
function streakLine(inp: KorridorInput): Line | null {
  const r = rate(inp, addDays(inp.today, -60));
  if (!r.length) return null;
  const last = r[r.length - 1];
  if (last.day < addDays(inp.today, -1)) return null; // nur, wenn der letzte Wert aktuell ist
  let n = 0;
  for (let i = r.length - 1; i >= 0 && r[i].pos === last.pos; i--) n++;
  if (n < 2) return null;
  return { key: "streak", text: `Seit ${n} Tagen ${posWord(last.pos)}.` };
}

// Wie schnell zurück: Median der Tage bis zur Rückkehr in den Bereich nach einem ungünstigen Tag
function recoveryLine(inp: KorridorInput): Line | null {
  const r = rate(inp, addDays(inp.today, -LOOK_DAYS));
  const durations: number[] = [];
  for (let i = 0; i < r.length; i++) {
    if (!r[i].bad || (i > 0 && r[i - 1].bad)) continue; // Beginn einer Abweichung
    const j = r.findIndex((x, k) => k > i && !x.bad);
    if (j < 0) break; // noch nicht zurück
    durations.push(Math.round((new Date(r[j].day + "T12:00:00").getTime() - new Date(r[i].day + "T12:00:00").getTime()) / 864e5));
  }
  if (durations.length < 3) return null;
  const m = Math.max(1, Math.round(median(durations) as number));
  const side = inp.higherIsBetter ? "unter" : "über";
  return { key: "recovery", text: `Nach einem Tag ${side} dem Bereich warst du meist nach ${tageText(m)} zurück (${durations.length}-mal im letzten Halbjahr).` };
}

// Verschiebung und Breite: 30-Tage-Bereich heute gegen vor 3 Monaten
function shiftLines(inp: KorridorInput): Line[] {
  const now = personalRange(inp.series, addDays(inp.today, 1), 30, inp.sick);
  const before = personalRange(inp.series, addDays(inp.today, 1 - SHIFT_DAYS), 30, inp.sick);
  if (!now?.stable || !before?.stable) return [];
  const out: Line[] = [];
  const w = (width(now) + width(before)) / 2;
  const diff = now.median - before.median;
  const rangeTxt = (r: Range) => `${inp.fmt(r.lo)}–${inp.fmt(r.hi)}`;
  out.push(
    Math.abs(diff) < 0.5 * w
      ? { key: "shift", text: `Dein Bereich liegt etwa wie vor 3 Monaten (${rangeTxt(now)}).` }
      : { key: "shift", text: `Dein Bereich liegt ${diff > 0 ? "höher" : "niedriger"} als vor 3 Monaten: ${rangeTxt(now)} statt ${rangeTxt(before)}.` },
  );
  const ratio = width(now) / width(before);
  if (ratio > 1.4) out.push({ key: "width", text: "Deine Werte schwanken zurzeit mehr als vor 3 Monaten." });
  else if (ratio < 0.7) out.push({ key: "width", text: "Deine Werte sind zurzeit gleichmäßiger als vor 3 Monaten." });
  return out;
}

// Wochenende gegen Werktage, letzte 90 Tage
function weekendLine(inp: KorridorInput): Line | null {
  const from = addDays(inp.today, -SHIFT_DAYS);
  const we: number[] = [];
  const wd: number[] = [];
  for (const p of inp.series) {
    if (p.day < from || p.day > inp.today || p.value === null || inp.sick?.has(p.day)) continue;
    // Nachtwerte gehören zum Abend davor: Nacht auf Samstag und auf Sonntag zählen zum Wochenende
    const g = new Date((inp.nightValue ? addDays(p.day, -1) : p.day) + "T12:00:00").getDay();
    (g === 0 || g === 6 ? we : wd).push(p.value);
  }
  const now = inp.bands.get(inp.today) ?? personalRange(inp.series, addDays(inp.today, 1), 30, inp.sick);
  if (we.length < 6 || wd.length < 15 || !now) return null;
  const diff = (mean(we) as number) - (mean(wd) as number);
  if (Math.abs(diff) < 0.5 * width(now)) return null;
  const when = inp.nightValue ? "In Nächten am Wochenende" : "Am Wochenende";
  return { key: "weekend", text: `${when} sind deine Werte meist ${diff > 0 ? "höher" : "niedriger"} als unter der Woche (${inp.fmt(mean(we) as number)} statt ${inp.fmt(mean(wd) as number)}).` };
}

// Was vor ungünstigen Tagen oft war: Gewohnheiten, harte Einheit, starke Symptome.
// Nur, was vor ungünstigen Tagen mindestens 3-mal und deutlich häufiger als sonst vorkam.
function beforeLine(inp: KorridorInput): Line | null {
  const r = rate(inp, addDays(inp.today, -LOOK_DAYS));
  const bad = r.filter((x) => x.bad);
  if (bad.length < 4) return null;
  // Auch Tage nur aus Garmin: Sport und Stress von garmin-sync zählen als Faktor (Periode aus Garmin hat keine Gewohnheiten)
  const diaryBy = new Map(inp.diary.map((d) => [d.day, d]));
  const ctxDay = (day: string) => (inp.nightValue ? addDays(day, -1) : day);
  const factorsOf = (day: string): string[] => {
    const c = ctxDay(day);
    const f: string[] = [];
    const e = diaryBy.get(c);
    if (e) {
      for (const k of e.influences ?? []) if (!LEGACY_HABIT_KEYS.includes(k)) f.push(`h:${k}`);
      if (Object.values(e.symptoms ?? {}).some((v) => v >= 3)) f.push("symptome");
    }
    if (loadPercent(c, inp.daily, inp.acts) >= HARD_DAY_PCT) f.push("hart");
    return f;
  };
  const count = (rows: Rated[]) => {
    const m = new Map<string, number>();
    for (const x of rows) for (const f of new Set(factorsOf(x.day))) m.set(f, (m.get(f) ?? 0) + 1);
    return m;
  };
  const inBad = count(bad);
  const inAll = count(r);
  const name = (f: string) => (f === "hart" ? "einen Tag mit hoher Belastung" : f === "symptome" ? "starke Symptome" : inp.habitLabel(f.slice(2)));
  const hits = [...inBad.entries()]
    .filter(([f, n]) => n >= 3 && n / bad.length >= 1.5 * ((inAll.get(f) ?? 0) / r.length))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (!hits.length) return null;
  const side = inp.higherIsBetter ? "unter" : "über";
  const what = hits.map(([f, n]) => `${name(f)} (${n} von ${bad.length})`).join(", ");
  return { key: "before", text: `Tage ${side} dem Bereich folgten oft auf ${what}. Ein Zusammenhang, keine Ursache.` };
}

// Alle Zeilen für den Abschnitt „Dein Bereich“. Zeilen ohne genug Daten fallen weg.
export function korridorLines(inp: KorridorInput): Line[] {
  return [shareLine(inp), streakLine(inp), recoveryLine(inp), ...shiftLines(inp), weekendLine(inp), beforeLine(inp)].filter((l): l is Line => l !== null);
}

// Serie für Heute: Wert seit mindestens 3 Tagen auf der ungünstigen Seite
export function badStreak(series: Point[], bands: Map<string, Range | null>, today: string, higherIsBetter: boolean): number {
  const r = series
    .filter((p) => p.day > addDays(today, -14) && p.day <= today && p.value !== null && bands.get(p.day))
    .map((p) => positionIn(p.value as number, bands.get(p.day) as Range));
  const badPos: Position = higherIsBetter ? "unter" : "über";
  let n = 0;
  for (let i = r.length - 1; i >= 0 && r[i] === badPos; i--) n++;
  return n;
}
