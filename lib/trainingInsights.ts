"use client";

// Training-Insights (Konzept docs/konzept-training-insights.md, freigegeben 23.11.)
// Drei Ebenen: eine Einheit (Vergleich, Zeitstrahl, danach), eine Sportart (Verlauf), Muster über alle Einheiten.
// Reine Rechenfunktionen, die Seiten laden die Daten selbst.

import type { Activity } from "@/lib/garmin";
import { METRICS } from "@/lib/garmin";
import { readLoadDay, LOAD_ZONES } from "@/lib/alltagslast";
import { metricBaseline, positionIn, type Position } from "@/lib/baseline";
import { computeTarget, type Data, type Pattern } from "@/lib/insights";
import { cycleToday, groupOf, PHASES, PHASE_GROUP_LABEL, readinessFrom, type PhaseGroup } from "@/lib/cycle";
import { shiftDay } from "@/lib/dates";
import { SPORTS, sportOf, type Sport } from "@/lib/training";

// Einheit mit den Spalten aus Migration 20261127090000_training_insights (fehlen sie, bleiben sie leer)
export type Unit = Activity & {
  hr_points?: number | null;
  hr_zones?: number[] | null; // Minuten je Zone 0–5
  hr_series?: (number | null)[] | null; // Puls je 5 Minuten ab Beginn
  rpe?: number | null; // eigene Anstrengung 1–10
};

export const MIN_UNITS = 5; // so viele Einheiten braucht ein Muster je Gruppe (Nutzerin 23.11.)
export const COMPARE_UNITS = 5; // Vergleich mit den letzten 5 Einheiten derselben Sportart
export const SERIES_STEP = 5; // Minuten je Abschnitt im Pulsverlauf
const HR_REST_START = 60;
const HR_MAX_START = 170;

export const unitDay = (u: Pick<Activity, "start_local">) => (u.start_local ?? "").slice(0, 10);
// Minuten seit Mitternacht aus „JJJJ-MM-TT HH:MM:SS“ oder „…THH:MM:SS“
export function startMinute(u: Pick<Activity, "start_local">): number | null {
  const m = /[ T](\d{2}):(\d{2})/.exec(u.start_local ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export const clockOf = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const nums = (v: (number | null | undefined)[]) => v.filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0);
export const sportName = (s: Sport) => SPORTS[s].label;

// ---------- 1 · Einheit

export type Compare = {
  n: number;
  duration: number | null; // Sekunden
  avgHr: number | null;
  maxHr: number | null;
  load: number | null;
  verdict: "härter" | "leichter" | "üblich" | null;
  sentence: string;
};

// Die letzten Einheiten derselben Sportart vor dieser
export function previousSame(u: Unit, all: Unit[], n = COMPARE_UNITS): Unit[] {
  const sp = sportOf(u);
  return all
    .filter((a) => a.activity_id !== u.activity_id && sportOf(a) === sp && (a.start_local ?? "") < (u.start_local ?? ""))
    .sort((a, b) => ((b.start_local ?? "") > (a.start_local ?? "") ? 1 : -1))
    .slice(0, n);
}

export function compareUnit(u: Unit, all: Unit[]): Compare {
  const prev = previousSame(u, all);
  const label = sportName(sportOf(u));
  const c = {
    n: prev.length,
    duration: mean(nums(prev.map((a) => a.duration_s))),
    avgHr: mean(nums(prev.map((a) => a.avg_hr))),
    maxHr: mean(nums(prev.map((a) => a.max_hr))),
    load: mean(nums(prev.map((a) => a.training_load))),
  };
  if (prev.length < 3) {
    return { ...c, verdict: null, sentence: `Für einen Vergleich braucht es 3 frühere ${label}-Einheiten, bisher ${prev.length}.` };
  }
  let verdict: Compare["verdict"] = "üblich";
  if (u.training_load && c.load) {
    const r = u.training_load / c.load;
    verdict = r >= 1.12 ? "härter" : r <= 0.88 ? "leichter" : "üblich";
  } else if (u.avg_hr && c.avgHr) {
    const d = u.avg_hr - c.avgHr;
    verdict = d >= 5 ? "härter" : d <= -5 ? "leichter" : "üblich";
  }
  const sentence =
    verdict === "härter"
      ? `Härter als deine letzten ${label}-Einheiten.`
      : verdict === "leichter"
        ? `Leichter als deine letzten ${label}-Einheiten.`
        : `Ungefähr wie deine letzten ${label}-Einheiten.`;
  return { ...c, verdict, sentence };
}

// Kurzer Vergleichstext für eine Kachel
export function diffNote(value: number | null | undefined, usual: number | null, unit: string, fmt: (v: number) => string = (v) => String(Math.round(v)), tolerance = 0): string {
  if (!value || usual === null) return "";
  const d = value - usual;
  if (Math.abs(d) <= tolerance) return "wie üblich";
  return `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}${unit} zu deinem Schnitt`;
}

// Zonen: gleiche Grenzen wie die Belastung aus dem Alltag (Anteil zwischen Ruhepuls und Maximalpuls)
export function zoneOf(hr: number, rest: number, max: number): number {
  const span = Math.max(20, max - rest);
  const frac = (hr - rest) / span;
  let z = 0;
  for (const lz of LOAD_ZONES) if (lz.zone > 0 && frac >= lz.von) z = lz.zone;
  return z;
}
export const ZONE_NAMES = LOAD_ZONES.map((z) => z.name);

export type ZoneSummary = { minutes: number[]; total: number; main: number; sentence: string };

export function zoneSummary(u: Unit): ZoneSummary | null {
  const z = u.hr_zones;
  if (!Array.isArray(z) || z.length < 6) return null;
  const minutes = z.slice(0, 6).map((v) => Math.max(0, Number(v) || 0));
  const total = minutes.reduce((a, b) => a + b, 0);
  if (total < 5) return null;
  const main = minutes.indexOf(Math.max(...minutes));
  const hard = minutes[4] + minutes[5];
  const sentence =
    hard >= total * 0.3
      ? `Fast ein Drittel der Zeit oder mehr war hart oder sehr hart (${Math.round(hard)} Minuten).`
      : main === 0
        ? "Die meiste Zeit war der Puls im Ruhebereich."
        : `Die meiste Zeit im Bereich „${ZONE_NAMES[main]}“ (Zone ${main}).`;
  return { minutes, total, main, sentence };
}

export type Seg = { i: number; from: number; hr: number | null; zone: number | null; cum: number };
export type Timeline = { segs: Seg[]; total: number; usesGarmin: boolean; peak: { from: number; to: number; share: number } | null; sentence: string };

// Zeitstrahl: Puls je 5 Minuten, dazu die bis dahin aufgebaute Belastung.
// Die Belastung je Abschnitt ist eine Schätzung aus Zone × Minuten, hochgerechnet auf die Garmin-Belastung der Einheit.
export function timeline(u: Unit, data: Data | null): Timeline | null {
  const s = u.hr_series;
  if (!Array.isArray(s) || nums(s).length < 3) return null;
  const ld = data ? readLoadDay(data.daily.find((d) => d.day === unitDay(u))?.load_daily_min) : null;
  const rest = ld?.puls_ruhe ?? HR_REST_START;
  const max = ld?.puls_max ?? Math.max(HR_MAX_START, u.max_hr ?? 0);
  const start = startMinute(u) ?? 0;
  const pts = s.map((hr) => (typeof hr === "number" ? zoneOf(hr, rest, max) * SERIES_STEP : 0));
  const sum = pts.reduce((a, b) => a + b, 0);
  const usesGarmin = !!u.training_load && sum > 0;
  const total = usesGarmin ? (u.training_load as number) : sum;
  let acc = 0;
  const segs: Seg[] = s.map((hr, i) => {
    acc += pts[i];
    return { i, from: start + i * SERIES_STEP, hr: typeof hr === "number" ? hr : null, zone: typeof hr === "number" ? zoneOf(hr, rest, max) : null, cum: sum ? (acc / sum) * total : 0 };
  });
  // Härtester Abschnitt: 25 Minuten am Stück mit dem größten Anteil, nur bei Einheiten ab 40 Minuten
  let peak: Timeline["peak"] = null;
  const win = 5;
  if (sum > 0 && s.length >= 8) {
    let best = -1;
    let at = 0;
    for (let i = 0; i + win <= pts.length; i++) {
      const v = pts.slice(i, i + win).reduce((a, b) => a + b, 0);
      if (v > best) {
        best = v;
        at = i;
      }
    }
    peak = { from: start + at * SERIES_STEP, to: start + (at + win) * SERIES_STEP, share: best / sum };
  }
  const sentence = peak
    ? `${Math.round(peak.share * 100)} % der Belastung kamen zwischen ${clockOf(peak.from)} und ${clockOf(peak.to)}.`
    : "So hat sich die Belastung über die Einheit aufgebaut.";
  return { segs, total, usesGarmin, peak, sentence };
}

export type AfterRow = { key: string; label: string; value: string; pos: Position | null; range: string; good: boolean | null };
export type After = { day: string; pending: boolean; rows: AfterRow[]; sentence: string };

// Am Morgen danach: HRV, Ruhepuls, Schlaf der Nacht und Readiness, jeweils gegen deinen Bereich
export function afterUnit(u: Unit, data: Data, today: string): After {
  const next = shiftDay(unitDay(u), 1);
  if (next > today) return { day: next, pending: true, rows: [], sentence: "Morgen früh erscheinen hier HRV, Ruhepuls, Schlaf und Readiness nach dieser Einheit." };
  const ctx = { diary: data.diary, sick: data.sick };
  const d = data.daily.find((x) => x.day === next);
  const rows: AfterRow[] = [];
  for (const key of ["hrv", "ruhepuls", "schlaf"] as const) {
    const m = METRICS[key];
    const v = d ? m.value(d) : null;
    if (v === null) continue;
    const b = metricBaseline(key, data.daily, ctx, next).active;
    const pos = b ? positionIn(v, b) : null;
    const good = pos === null || pos === "im" ? null : (pos === "über") === m.higherIsBetter;
    rows.push({ key, label: m.label, value: m.fmt(v), pos, range: b ? `${m.fmt(b.lo).replace(/ .*$/, "")}–${m.fmt(b.hi)}` : "", good });
  }
  const t = computeTarget(next, data);
  if (t.enoughData) {
    const r = readinessFrom(t);
    rows.push({ key: "readiness", label: "Readiness", value: r.value.toLocaleString("de-DE", { maximumFractionDigits: 1 }), pos: null, range: r.label, good: null });
  }
  const worse = rows.filter((r) => r.good === false).length;
  const better = rows.filter((r) => r.good === true).length;
  const sentence = !rows.length
    ? "Für den Morgen danach fehlen Garmin-Werte."
    : worse
      ? "Am nächsten Morgen etwas unter deinem Üblichen."
      : better
        ? "Am nächsten Morgen besser als üblich."
        : "Am nächsten Morgen in deinem Bereich.";
  return { day: next, pending: false, rows, sentence };
}

export function unitCycle(u: Unit, data: Data): string | null {
  const c = cycleToday(unitDay(u), data.diary);
  if (!c.cycleDay || !c.phase) return null;
  return `Zyklustag ${c.cycleDay} · ${PHASES[c.phase].label} (geschätzt)`;
}

// ---------- 2 · Sportart

export function unitsOf(sport: Sport, acts: Unit[], n = 12): Unit[] {
  return acts
    .filter((a) => sportOf(a) === sport && a.start_local)
    .sort((a, b) => ((a.start_local ?? "") > (b.start_local ?? "") ? 1 : -1))
    .slice(-n);
}

export type SportSummary = { units: Unit[]; perWeek: number; avgDuration: number | null; avgRpe: number | null; rpeN: number; sentence: string };

export function sportSummary(sport: Sport, acts: Unit[], today: string): SportSummary {
  const units = unitsOf(sport, acts);
  const label = sportName(sport);
  const from = shiftDay(today, -55);
  const recent = acts.filter((a) => sportOf(a) === sport && unitDay(a) >= from && unitDay(a) <= today).length;
  const rpes = nums(units.map((u) => u.rpe));
  const base = { units, perWeek: recent / 8, avgDuration: mean(nums(units.map((u) => u.duration_s))), avgRpe: mean(rpes), rpeN: rpes.length };
  if (units.length < 6) return { ...base, sentence: `Ein Verlauf für ${label} erscheint ab 6 Einheiten, bisher ${units.length}.` };
  const half = Math.floor(units.length / 2);
  const a = mean(nums(units.slice(0, half).map((u) => u.training_load)));
  const b = mean(nums(units.slice(half).map((u) => u.training_load)));
  const ha = mean(nums(units.slice(0, half).map((u) => u.avg_hr)));
  const hb = mean(nums(units.slice(half).map((u) => u.avg_hr)));
  const loadWord = a && b ? (b / a >= 1.1 ? "gestiegen" : b / a <= 0.9 ? "gesunken" : "gleich geblieben") : null;
  const hrWord = ha && hb ? (hb - ha >= 4 ? "höher" : hb - ha <= -4 ? "niedriger" : "gleich") : null;
  const sentence = loadWord
    ? `Bei ${label} ist die Belastung zuletzt ${loadWord}${hrWord ? `, der Puls ${hrWord === "gleich" ? "blieb gleich" : "war " + hrWord}` : ""}.`
    : `Deine letzten ${units.length} ${label}-Einheiten im Überblick.`;
  return { ...base, sentence };
}

// ---------- 3 · Muster

const sportsWith = (acts: Unit[]) => (Object.keys(SPORTS) as Sport[]).filter((s) => s !== "sonstiges" && acts.some((a) => sportOf(a) === s));
const signed = (v: number, unit: string, digits = 0) => {
  const r = Number(v.toFixed(digits));
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toLocaleString("de-DE", { maximumFractionDigits: digits })} ${unit}`;
};

// HRV am Morgen nach der Einheit gegen die Mitte deines Bereichs, je Sportart
function hrvAfterPattern(data: Data): Pattern {
  const ctx = { diary: data.diary, sick: data.sick };
  const bars: Pattern["bars"] = [];
  let total = 0;
  let worst: { label: string; v: number } | null = null;
  for (const sp of sportsWith(data.acts)) {
    const diffs: number[] = [];
    const days = new Set<string>();
    for (const a of data.acts) {
      if (sportOf(a) !== sp) continue;
      const next = shiftDay(unitDay(a), 1);
      if (days.has(next)) continue;
      const v = data.daily.find((d) => d.day === next)?.hrv_last_night;
      const b = metricBaseline("hrv", data.daily, ctx, next).active;
      if (!v || !b) continue;
      days.add(next);
      diffs.push(v - b.median);
    }
    if (diffs.length < MIN_UNITS) continue;
    const m = mean(diffs) as number;
    total += diffs.length;
    bars.push({ label: `${SPORTS[sp].label} (${diffs.length})`, value: m, display: signed(m, "ms") });
    if (!worst || m < worst.v) worst = { label: SPORTS[sp].label, v: m };
  }
  const ready = bars.length > 0 && !!worst;
  if (ready && worst && Math.abs(worst.v) >= 1) {
    const hi = bars.find((b) => b.label.startsWith(worst!.label));
    if (hi) hi.highlight = true;
  }
  return {
    key: "training-hrv",
    title: "HRV am Morgen nach dem Training",
    ready,
    need: `Erscheint, sobald eine Sportart ${MIN_UNITS} Einheiten mit HRV am nächsten Morgen hat.`,
    text: worst
      ? Math.abs(worst.v) < 1
        ? "Nach keiner Sportart weicht deine HRV am nächsten Morgen deutlich ab."
        : `Nach ${worst.label} liegt deine HRV am nächsten Morgen im Schnitt ${Math.abs(Math.round(worst.v))} ms ${worst.v < 0 ? "unter" : "über"} deinem Üblichen.`
      : "",
    bars,
    basis: `${total} Einheiten, verglichen mit der Mitte deines Bereichs (Zahl in Klammern: Einheiten)`,
  };
}

// Puls Ø bei derselben Sportart je Zyklusphase
function hrByPhasePattern(data: Data): Pattern {
  let bestSport: Sport | null = null;
  let best: Record<PhaseGroup, number[]> | null = null;
  let bestReady = 0;
  for (const sp of sportsWith(data.acts)) {
    const acc: Record<PhaseGroup, number[]> = { menstruation: [], follikel: [], eisprung: [], luteal: [] };
    for (const a of data.acts) {
      if (sportOf(a) !== sp || !a.avg_hr) continue;
      const g = groupOf(cycleToday(unitDay(a), data.diary).phase);
      if (g) acc[g].push(a.avg_hr);
    }
    const ready = (Object.values(acc) as number[][]).filter((v) => v.length >= MIN_UNITS).length;
    if (ready > bestReady) {
      bestReady = ready;
      best = acc;
      bestSport = sp;
    }
  }
  const base = { key: "training-puls-phase", title: "Puls im Training nach Zyklusphase", need: `Erscheint, sobald eine Sportart in zwei Zyklusphasen je ${MIN_UNITS} Einheiten mit Puls hat.` };
  if (!best || !bestSport || bestReady < 2) return { ...base, ready: false, text: "", bars: [], basis: "" };
  const rows = (Object.keys(best) as PhaseGroup[]).filter((g) => best![g].length >= MIN_UNITS).map((g) => ({ g, m: mean(best![g]) as number, n: best![g].length }));
  const hi = rows.reduce((a, b) => (b.m > a.m ? b : a));
  const lo = rows.reduce((a, b) => (b.m < a.m ? b : a));
  const d = Math.round(hi.m - lo.m);
  const label = SPORTS[bestSport].label;
  return {
    ...base,
    ready: true,
    text: d >= 3 ? `Bei ${label} ist dein Puls in der Phase ${PHASE_GROUP_LABEL[hi.g]} im Schnitt ${d} Schläge höher als in der Phase ${PHASE_GROUP_LABEL[lo.g]}.` : `Bei ${label} ist dein Puls in allen Phasen etwa gleich.`,
    bars: rows.map((r) => ({ label: `${PHASE_GROUP_LABEL[r.g]} (${r.n})`, value: r.m, display: `${Math.round(r.m)}`, highlight: d >= 3 && r.g === hi.g })),
    basis: `Puls Ø in bpm aus ${rows.reduce((a, r) => a + r.n, 0)} ${label}-Einheiten, Phasen geschätzt`,
  };
}

// Schlaf in der Nacht nach Training ab 20 Uhr gegen früheres Training
function eveningSleepPattern(data: Data): Pattern {
  const late: number[] = [];
  const early: number[] = [];
  const seen = new Set<string>();
  for (const a of [...data.acts].sort((x, y) => ((x.start_local ?? "") > (y.start_local ?? "") ? -1 : 1))) {
    const day = unitDay(a);
    const sm = startMinute(a);
    if (!day || sm === null || seen.has(day) || sportOf(a) === "sonstiges") continue;
    seen.add(day);
    const s = data.daily.find((d) => d.day === shiftDay(day, 1))?.sleep_seconds;
    if (!s) continue;
    (sm >= 20 * 60 ? late : early).push(s / 60);
  }
  const base = { key: "training-abend-schlaf", title: "Schlaf nach Abendtraining" };
  if (late.length < MIN_UNITS || early.length < MIN_UNITS) {
    return { ...base, ready: false, need: `Erscheint ab ${MIN_UNITS} Trainingstagen ab 20 Uhr und ${MIN_UNITS} früher, bisher ${late.length} und ${early.length}.`, text: "", bars: [], basis: "" };
  }
  const ml = mean(late) as number;
  const me = mean(early) as number;
  const d = Math.round(ml - me);
  const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h`;
  return {
    ...base,
    ready: true,
    need: "",
    text: Math.abs(d) < 10 ? "Nach Abendtraining schläfst du etwa so lange wie nach früherem Training." : `Nach Training ab 20 Uhr schläfst du im Schnitt ${Math.abs(d)} Minuten ${d < 0 ? "kürzer" : "länger"} als nach früherem Training.`,
    bars: [
      { label: `ab 20 Uhr (${late.length})`, value: ml, display: hm(ml), highlight: d <= -10 },
      { label: `früher (${early.length})`, value: me, display: hm(me) },
    ],
    basis: `${late.length + early.length} Trainingstage, Schlaf der Nacht danach`,
  };
}

export function trainingPatterns(data: Data): Pattern[] {
  return [hrvAfterPattern(data), hrByPhasePattern(data), eveningSleepPattern(data)];
}

// ---------- Coach

// Kurze Zeile für den Coach: nur Kennzahlen der letzten Einheit
export function coachUnitLine(acts: Unit[], data: Data): string | null {
  const last = [...acts].filter((a) => a.start_local).sort((a, b) => ((a.start_local ?? "") > (b.start_local ?? "") ? -1 : 1))[0];
  if (!last) return null;
  const c = compareUnit(last, data.acts);
  const parts = [
    `${unitDay(last)} ${sportName(sportOf(last))}`,
    last.duration_s ? `${Math.round(last.duration_s / 60)} min` : "",
    last.avg_hr ? `Puls Ø ${last.avg_hr}` : "",
    last.training_load ? `Belastung ${Math.round(last.training_load)}` : "",
    c.verdict ? `Vergleich mit den letzten ${c.n}: ${c.verdict}` : "",
    last.rpe ? `gefühlte Anstrengung ${last.rpe}/10` : "",
  ].filter(Boolean);
  return "Letzte Einheit: " + parts.join(", ") + ".";
}
