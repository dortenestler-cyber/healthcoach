// Schlaf nach Menge und Qualität (docs/konzept-schlafqualitaet.md, freigegeben 25.11.2026).
// Menge: % vom Bedarf (bis 100). Erholsam: 0–100 aus fünf Bausteinen. Gesamt: Mittel aus beidem.
// Reine Berechnung ohne Netzwerk. Startwerte zum Kalibrieren, keine medizinische Bewertung.

import { baselineFor, metricBaseline, type Baseline, type Range } from "@/lib/baseline";
import { METRICS, type Daily, type MetricKey } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { hm, sleepAchieved, type Row } from "@/lib/today";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const lin = (v: number, zero: number, full: number) => clamp(((v - zero) / (full - zero)) * 100);
// Punkte nach Lage im eigenen Bereich: typische Nacht (Mitte) 80, untere Grenze 60, obere 95, deutlich besser 100.
// Unter dem Bereich fällt es bis 0 bei anderthalb Bereichsbreiten darunter. lower: weniger ist besser (Ruhepuls, Atem).
function rangePoints(v: number, r: Range, lower = false): number {
  const w = Math.max(r.hi - r.lo, Math.abs(r.median) * 0.05, 0.01);
  const x = lower ? 2 * r.median - v : v; // gespiegelt, damit weniger besser zählt
  const lo = lower ? 2 * r.median - r.hi : r.lo;
  const hi = lower ? 2 * r.median - r.lo : r.hi;
  if (x < lo) return lin(x, lo - 1.5 * w, lo) * 0.6;
  if (x < r.median) return 60 + ((x - lo) / Math.max(r.median - lo, 0.01)) * 20;
  if (x <= hi) return 80 + ((x - r.median) / Math.max(hi - r.median, 0.01)) * 15;
  return Math.min(100, 95 + ((x - hi) / (0.5 * w)) * 5);
}

const fixed = (lo: number, hi: number): Range => ({ lo, hi, median: (lo + hi) / 2, n: 30, stable: true });
const plain = (r: Range): Baseline => ({ range: r, phase: null, phaseKey: null, active: r });

export type PartKey = "durch" | "effizienz" | "phasen" | "regel" | "koerper";
export type Part = { key: PartKey; label: string; weight: number; points: number; weak: string };
export type SleepScore = {
  total: number | null; // Ring
  amount: number | null; // Menge in % vom Bedarf, bis 100
  pct: number | null; // Menge ungedeckelt, für den Satz
  rest: number | null; // Erholsam
  word: string | null;
  parts: Part[];
  hours: number | null;
};

// Wörter zum Gesamtwert, ohne Ampel
export function sleepWord(v: number): string {
  return v >= 85 ? "gut" : v >= 70 ? "mittel" : "wenig erholsam";
}

const night = (data: Data, day: string) => data.daily.find((d) => d.day === day);
const awakeMin = (d: Daily | undefined) => (d && d.sleep_awake_s != null ? d.sleep_awake_s / 60 : null);
const efficiency = (d: Daily | undefined) => (d?.sleep_seconds && d.sleep_awake_s != null ? (d.sleep_seconds / (d.sleep_seconds + d.sleep_awake_s)) * 100 : null);
const share = (s: number | null | undefined, d: Daily | undefined) => (s && d?.sleep_seconds ? (s / d.sleep_seconds) * 100 : null);
const startMin = (d: Daily | undefined) => (d?.sleep_start_min == null ? null : d.sleep_start_min < 720 ? d.sleep_start_min + 1440 : d.sleep_start_min);
const endMin = (d: Daily | undefined) => (d?.sleep_end_min == null ? null : d.sleep_end_min);

// Abstand von Einschlafen und Aufwachen zu deinem Mittel der 7 Nächte davor, in Minuten (positiv = später)
function timing(day: string, data: Data): { start: number | null; end: number | null } {
  const prev = Array.from({ length: 7 }, (_, i) => night(data, addDays(day, -1 - i)));
  const mean = (f: (d: Daily | undefined) => number | null) => {
    const v = prev.map(f).filter((x): x is number => x !== null);
    return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const d = night(data, day);
  const s = startMin(d), e = endMin(d), ms = mean(startMin), me = mean(endMin);
  return { start: s !== null && ms !== null ? s - ms : null, end: e !== null && me !== null ? e - me : null };
}

// Bereich für einen eigenen Wert (Effizienz, Anteile): eigener Bereich ab 14 Nächten, sonst Startwert
function rangeOf(f: (d: Daily) => number | null, day: string, data: Data, fallback: Range, cycle: boolean): Baseline {
  const b = baselineFor(data.daily.map((d) => ({ day: d.day, value: f(d) })), day, { diary: data.diary, sick: data.sick }, cycle);
  return b.active?.stable ? b : plain(fallback);
}

const minFmt = (v: number) => `${Math.round(v)} min`;
const pctFmt = (v: number) => `${Math.round(v)} %`;
const hmFmt = (v: number) => {
  const a = Math.round(Math.abs(v));
  return a >= 60 ? hm(a / 60) : `${a} min`;
};

function bodyParts(day: string, data: Data) {
  const keys: { key: MetricKey; higher: boolean; weak: string }[] = [
    { key: "ruhepuls", higher: false, weak: "Ruhepuls erhöht" },
    { key: "hrv", higher: true, weak: "HRV niedrig" },
    { key: "atem", higher: false, weak: "Atem schneller als sonst" },
  ];
  const d = night(data, day);
  return keys.map((k) => {
    const v = d ? METRICS[k.key].value(d) : null;
    const b = metricBaseline(k.key, data.daily, { diary: data.diary, sick: data.sick }, day);
    const r = b.active?.stable ? b.active : null;
    const bad = v === null || !r ? null : k.higher ? v < r.lo : v > r.hi;
    const points = v === null || !r ? null : rangePoints(v, r, !k.higher);
    return { ...k, bad, points };
  });
}

export function sleepScore(day: string, data: Data): SleepScore {
  const slept = sleepAchieved(day, data);
  const pct = slept.ratio === null ? null : Math.round(slept.ratio * 100);
  // Menge: Bedarf gedeckt 85 (der Bedarf ist dein üblicher Schlaf), 10 % mehr 100; darunter 2 Punkte je Prozentpunkt (94 % → 73)
  const amount = pct === null ? null : pct >= 100 ? Math.min(100, 85 + (pct - 100) * 1.5) : clamp(85 - (100 - pct) * 2);
  const d = night(data, day);
  const parts: Part[] = [];

  // Durchschlafen: je Aufwachen 10 Punkte, je Minute wach über 10 min 1,5 Punkte
  const cnt = d?.awake_count ?? null;
  const aw = awakeMin(d);
  if (cnt !== null || aw !== null) {
    const p = clamp(100 - (cnt !== null ? cnt * 10 : 0) - (aw !== null ? Math.max(0, aw - 10) * 1.5 : 0));
    parts.push({ key: "durch", label: "Durchschlafen", weight: 30, points: p, weak: cnt !== null && cnt >= 2 ? `${cnt}× wach` : `${hmFmt(aw ?? 0)} wach` });
  }

  // Effizienz: ab 98 % volle Punkte, bei 85 % keine
  const eff = efficiency(d);
  if (eff !== null) parts.push({ key: "effizienz", label: "Effizienz", weight: 20, points: lin(eff, 85, 98), weak: "viel wach gelegen" });

  // Tief- und REM-Schlaf als Anteil, gegen deinen Bereich (je Zyklusphase), sonst Startwerte
  const ph: { p: number; weak: string }[] = [];
  const ds = share(d?.sleep_deep_s, d);
  const rs = share(d?.sleep_rem_s, d);
  if (ds !== null) {
    ph.push({ p: rangePoints(ds, rangeOf((x) => share(x.sleep_deep_s, x), day, data, fixed(13, 23), true).active!), weak: "wenig Tiefschlaf" });
  }
  if (rs !== null) {
    ph.push({ p: rangePoints(rs, rangeOf((x) => share(x.sleep_rem_s, x), day, data, fixed(18, 25), true).active!), weak: "wenig REM-Schlaf" });
  }
  if (ph.length) {
    const worst = ph.reduce((a, b) => (b.p < a.p ? b : a));
    parts.push({ key: "phasen", label: "Tief- und REM-Schlaf", weight: 25, points: ph.reduce((a, b) => a + b.p, 0) / ph.length, weak: worst.weak });
  }

  // Regelmäßigkeit: bis 10 min Abstand volle Punkte, ab 75 min keine
  const t = timing(day, data);
  const devs = [t.start, t.end].filter((x): x is number => x !== null);
  if (devs.length) {
    const dev = Math.max(...devs.map(Math.abs));
    const s = t.start !== null && Math.abs(t.start) === dev;
    const v = s ? t.start! : t.end!;
    const weak = `${hmFmt(v)} ${v > 0 ? "später" : "früher"} ${s ? "eingeschlafen" : "aufgewacht"} als sonst`;
    parts.push({ key: "regel", label: "Regelmäßigkeit", weight: 10, points: lin(dev, 75, 10), weak });
  }

  // Erholung des Körpers: Ruhepuls, HRV, Atem nach Lage im eigenen Bereich
  const body = bodyParts(day, data).filter((b) => b.points !== null);
  if (body.length) {
    const bad = body.filter((b) => b.bad);
    parts.push({ key: "koerper", label: "Erholung des Körpers", weight: 15, points: body.reduce((a, b) => a + (b.points as number), 0) / body.length, weak: bad.map((b) => b.weak).join(", ") || "Körper erholt" });
  }

  const w = parts.reduce((a, p) => a + p.weight, 0);
  const rest = parts.length >= 3 ? Math.round(parts.reduce((a, p) => a + p.points * p.weight, 0) / w) : null;
  const total = amount === null ? null : rest === null ? amount : Math.round((amount + rest) / 2);
  return { total, amount, pct, rest, word: total === null ? null : sleepWord(total), parts, hours: slept.hours };
}

// Ein Satz: Menge, dann der schwächste Baustein, Nachtschweiß und Hitzewallungen aus dem Tagebuch
export function sleepSentence(day: string, data: Data, s: SleepScore): string {
  if (s.pct === null || s.hours === null) return "Für diese Nacht gibt es noch keinen Schlafwert.";
  const first = s.pct >= 100 ? `Genug geschlafen (${hm(s.hours)})` : s.pct >= 90 ? `Knapp genug geschlafen (${hm(s.hours)})` : `Zu wenig geschlafen (${hm(s.hours)})`;
  const weak = s.parts.filter((p) => p.points < 70);
  const worst = weak.length ? weak.reduce((a, b) => ((100 - b.points) * b.weight > (100 - a.points) * a.weight ? b : a)) : null;
  let out = worst ? `${first}, aber ${worst.weak}.` : s.rest !== null ? `${first}, ruhig und erholsam.` : `${first}.`;
  const diary = data.diary.filter((x) => x.day === day || x.day === addDays(day, -1));
  const tags = [(diary.some((x) => (x.symptoms?.nacht ?? 0) > 0) && "Nachtschweiß"), (diary.some((x) => (x.symptoms?.hitze ?? 0) > 0) && "Hitzewallungen")].filter(Boolean);
  if (tags.length && worst) out += ` ${tags.join(" und ")} eingetragen.`;
  return out;
}

// Faktoren für die Schlafseite (drei Stufen)
export function sleepRows(day: string, data: Data): Row[] {
  const d = night(data, day);
  const ctx = { diary: data.diary, sick: data.sick };
  const own = (key: string, label: string, value: number | null, fmt: (v: number) => string, base: Baseline): Row => ({ key, label, value, fmt, base });
  const awBase = baselineFor(data.daily.map((x) => ({ day: x.day, value: awakeMin(x) })), day, ctx, false);
  const t = timing(day, data);
  const dev = [t.start, t.end].filter((x): x is number => x !== null);
  const rows: Row[] = [
    { key: "schlaf", label: "Dauer", value: d ? METRICS.schlaf.value(d) : null, fmt: METRICS.schlaf.fmt, base: metricBaseline("schlaf", data.daily, ctx, day), href: "/wert/schlaf" },
    own("effizienz", "Effizienz", efficiency(d), pctFmt, rangeOf(efficiency, day, data, fixed(85, 95), false)),
    own("wach", "Wach", awakeMin(d), minFmt, awBase.active?.stable ? awBase : plain(fixed(5, 20))),
    { ...own("tiefschlaf", "Tiefschlaf", share(d?.sleep_deep_s, d), pctFmt, rangeOf((x) => share(x.sleep_deep_s, x), day, data, fixed(13, 23), true)), href: "/wert/tiefschlaf" },
    { ...own("rem", "REM-Schlaf", share(d?.sleep_rem_s, d), pctFmt, rangeOf((x) => share(x.sleep_rem_s, x), day, data, fixed(18, 25), true)), href: "/wert/rem" },
    own("regel", "Abstand zur Schlafzeit", dev.length ? Math.max(...dev.map(Math.abs)) : null, minFmt, plain(fixed(0, 30))),
  ];
  for (const k of ["ruhepuls", "hrv", "atem"] as MetricKey[]) {
    const v = d ? METRICS[k].value(d) : null;
    if (v !== null) rows.push({ key: k, label: METRICS[k].label, value: v, fmt: METRICS[k].fmt, base: metricBaseline(k, data.daily, ctx, day), href: `/wert/${k}` });
  }
  return rows.filter((r, i) => i === 0 || r.value !== null);
}

// Sauerstoff nur als Warnzeichen: niedrigster Wert in 3 der letzten 7 Nächte unter 88 %
export function spo2Warning(day: string, data: Data): boolean {
  const low = Array.from({ length: 7 }, (_, i) => night(data, addDays(day, -i))?.spo2_low).filter((v) => typeof v === "number" && v < 88);
  return low.length >= 3;
}

// Schlafwert je Nacht (Aufwachtag) für Muster und Vergleiche, einmal je Datenstand gerechnet
const scoreCache = new WeakMap<object, Map<string, number>>();
export function sleepScores(data: Data): Map<string, number> {
  const hit = scoreCache.get(data.daily);
  if (hit) return hit;
  const m = new Map<string, number>();
  for (const d of data.daily) {
    const t = sleepScore(d.day, data).total;
    if (t !== null) m.set(d.day, t);
  }
  scoreCache.set(data.daily, m);
  return m;
}
