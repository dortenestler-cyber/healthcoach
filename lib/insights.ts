// Tagesziel und Muster: reine Berechnungen aus den Daten, ohne Netzwerk.
// Alles vorsichtig formuliert: Zusammenhänge, keine Beweise, keine Diagnosen.

import type { Activity, Daily } from "@/lib/garmin";
import { INFLUENCES } from "@/lib/catalog";
import { illnessRule, type Illness } from "@/lib/health";
import { sportOf, type Sport } from "@/lib/training";
import { alltagMinutes, readLoadDay } from "@/lib/alltagslast";
import { baselineFor, RANGE_PHASE_NAMES, type Baseline, type Range } from "@/lib/baseline";

export type Diary = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[]; fromGarmin?: boolean; garminOnly?: boolean; ovulation?: string[] };
// fromGarmin: Blutung an diesem Tag stammt aus Garmin · garminOnly: kein eigener Tagebucheintrag an diesem Tag
// (Periode aus Garmin oder nur Sport/Stress von garmin-sync, Spalte manual = false)
export type Checkin = { day: string; energy: number | null; sleep: number | null; mood: number | null };
export type Hub = { day: string };

export type Data = {
  daily: Daily[];
  acts: Activity[];
  diary: Diary[];
  checkins: Checkin[];
  hubs: Hub[]; // Bedarfs-Einnahmen
  illness: Illness | null;
  sick?: Set<string>; // Krankheitstage und 3 Tage danach: zählen nicht zum persönlichen Bereich
};

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v: number[]) => {
  const m = mean(v);
  return m === null || v.length < 2 ? null : Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

// ---------- Belastung

export const FULL_DAY_LOAD = 150; // 100 % entspricht grob einem harten Trainingstag: 150 Garmin-Last

export type DayLoad = {
  training: number; // Garmin-Last der Trainings
  alltag: number; // Alltag in derselben Einheit (0 ohne Daten)
  pct: number; // Belastung gesamt, 0–100
  pctTraining: number; // davon Training
  pctAlltag: number; // davon Alltag
  quelle: "puls" | "schritte" | null; // null: Tag ohne Alltagsdaten (alte Berechnung)
  alltagMin: number | null; // Minuten in Bewegung im Alltag
  steps: number | null; // Schritte außerhalb von Trainings
};

// Belastung eines Tages aus Training und Alltag (Konzept Korridore und Alltagslast, Teil B).
// Gibt es für den Tag keine Alltagsdaten, gilt die alte Rechnung: 60 Intensitätsminuten oder 150 Trainingslast = 100 %.
export function dayLoad(day: string, daily: Daily[], acts: Activity[]): DayLoad {
  const d = daily.find((r) => r.day === day);
  const tl = acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day).reduce((s, a) => s + (a.training_load ?? 0), 0);
  const ld = readLoadDay(d?.load_daily_min);
  const pctOf = (v: number) => (v / FULL_DAY_LOAD) * 100;
  if (!ld) {
    const im = d?.intensity_minutes ?? 0;
    const pct = Math.round(Math.min(100, Math.max((im / 60) * 100, pctOf(tl))));
    return { training: tl, alltag: 0, pct, pctTraining: pct, pctAlltag: 0, quelle: null, alltagMin: null, steps: d?.steps_outside_acts ?? null };
  }
  const training = tl || ld.last_training || 0;
  const alltag = Math.max(0, ld.last_alltag ?? 0);
  const pct = Math.round(Math.min(100, pctOf(training + alltag)));
  const pctTraining = Math.min(pct, Math.round(pctOf(training)));
  return { training, alltag, pct, pctTraining, pctAlltag: pct - pctTraining, quelle: ld.quelle, alltagMin: alltagMinutes(ld), steps: d?.steps_outside_acts ?? null };
}

export function loadPercent(day: string, daily: Daily[], acts: Activity[]): number {
  return dayLoad(day, daily, acts).pct;
}

// Erster Tag mit Alltagsdaten (für den einmaligen Hinweis, dass Werte jetzt höher liegen)
export function firstAlltagDay(daily: Daily[]): string | null {
  return daily.filter((d) => readLoadDay(d.load_daily_min)).map((d) => d.day).sort()[0] ?? null;
}

// ---------- Zyklus

export function periodStarts(diary: Diary[]): string[] {
  const bleed = new Set(diary.filter((d) => d.bleeding >= 2).map((d) => d.day));
  const any = new Set(diary.filter((d) => d.bleeding >= 1).map((d) => d.day));
  // Beginn: Tag mit mindestens leichter Blutung, an den zwei Tagen davor keine Blutung
  return [...bleed].filter((d) => !any.has(addDays(d, -1)) && !any.has(addDays(d, -2))).sort();
}

export function cycleInfo(day: string, diary: Diary[]): { cycleDay: number | null; length: number; beforePeriod: boolean; cycles: number; fromGarmin: boolean } {
  const starts = periodStarts(diary).filter((s) => s <= day);
  const lens: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const l = Math.round((new Date(starts[i]).getTime() - new Date(starts[i - 1]).getTime()) / 864e5);
    if (l >= 15 && l <= 60) lens.push(l);
  }
  const length = Math.round(mean(lens) ?? 28);
  const last = starts[starts.length - 1];
  if (!last) return { cycleDay: null, length, beforePeriod: false, cycles: lens.length, fromGarmin: false };
  const cycleDay = Math.round((new Date(day).getTime() - new Date(last).getTime()) / 864e5) + 1;
  const fromGarmin = !!diary.find((d) => d.day === last)?.fromGarmin;
  return { cycleDay, length, beforePeriod: cycleDay > length - 5 && cycleDay <= length + 3, cycles: lens.length, fromGarmin };
}

// ---------- Tagesziel

export type Factor = { name: string; value: string; note: string; effect: number };
export type Target = { score: number; label: string; lo: number; hi: number; factors: Factor[]; pause: boolean; enoughData: boolean };

const BANDS = [
  { min: 85, label: "Hart möglich", lo: 65, hi: 85 },
  { min: 65, label: "Moderat", lo: 45, hi: 65 },
  { min: 45, label: "Leicht", lo: 25, hi: 45 },
  { min: -999, label: "Erholung", lo: 10, hi: 25 },
];

// Ein Faktor der Readiness: heutiger Wert gegen den persönlichen Bereich (30 Tage ohne heute, mittlere Hälfte, ab 14 Tagen).
// In der Lutealphase gilt für HRV und Ruhepuls der Luteal-Bereich (lib/baseline.ts).
// Abstand außerhalb des Bereichs in Bereichsbreiten: ab 0,6 voller Abzug, darunter halber Abzug, deutlich besser ein kleiner Bonus.
function rangeFactor(name: string, v: number | null, range: Range | null, phaseName: string | null, fmt: (x: number) => string, higherIsBetter: boolean, weight: number, unit = ""): Factor | null {
  if (v === null) return null;
  if (!range) return { name, value: fmt(v) + unit, note: "Dein Bereich entsteht ab 7 Tagen", effect: 0 };
  if (!range.stable) return { name, value: fmt(v) + unit, note: `Dein Bereich ist noch vorläufig (${range.n} Tage), er zählt ab 14 Tagen`, effect: 0 };
  const width = range.hi - range.lo || Math.max(1, Math.abs(range.median) * 0.05);
  const below = v < range.lo ? (range.lo - v) / width : 0;
  const above = v > range.hi ? (v - range.hi) / width : 0;
  const bad = higherIsBetter ? below - above : above - below; // > 0: auf der ungünstigen Seite
  let effect = 0;
  if (bad > 0.6) effect = -weight;
  else if (bad > 0) effect = -Math.round(weight / 2);
  else if (bad < -0.5) effect = Math.round(weight / 4);
  const where = `${phaseName ? `Bereich ${phaseName}` : "dein Bereich"} ${fmt(range.lo)}–${fmt(range.hi)}${unit}`;
  const note = !below && !above ? `im Bereich (${where})` : `${above ? "über" : "unter"} dem Bereich (${where})`;
  return { name, value: fmt(v) + unit, note, effect };
}

export function computeTarget(day: string, data: Data): Target {
  const factors: Factor[] = [];
  const hist = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -30));
  const today = data.daily.find((r) => r.day === day) ?? null;
  const num = (f: (r: Daily) => number | null) => hist.map(f).filter((v): v is number => v !== null);

  const push = (f: Factor | null) => f && factors.push(f);
  const base = (f: (r: Daily) => number | null, cycleSensitive: boolean) => baselineFor(data.daily.map((r) => ({ day: r.day, value: f(r) })), day, { diary: data.diary, sick: data.sick }, cycleSensitive);
  const phaseName = (b: Baseline) => (b.phase && b.phaseKey ? RANGE_PHASE_NAMES[b.phaseKey] : null);
  const r0 = (x: number) => String(Math.round(x));
  const sl = base((r) => r.sleep_score, true);
  const hv = base((r) => r.hrv_last_night, true);
  const rh = base((r) => r.resting_hr, true);
  push(rangeFactor("Schlaf", today?.sleep_score ?? null, sl.active, phaseName(sl), r0, true, 10, " Punkte"));
  push(rangeFactor("HRV", today?.hrv_last_night ?? null, hv.active, phaseName(hv), r0, true, 12, " ms"));
  push(rangeFactor("Ruhepuls", today?.resting_hr ?? null, rh.active, phaseName(rh), r0, false, 8, " bpm"));
  if (today?.bb_max !== null && today?.bb_max !== undefined) {
    const bb = today.bb_max;
    factors.push({ name: "Body Battery", value: String(bb), note: bb < 30 ? "sehr niedrig" : bb < 50 ? "niedrig" : bb >= 75 ? "gut aufgeladen" : "mittel", effect: bb < 30 ? -15 : bb < 50 ? -8 : bb >= 75 ? 3 : 0 });
  }

  const ci = data.checkins.find((c) => c.day === day);
  if (ci) {
    const vals = [ci.energy, ci.sleep, ci.mood].filter((v): v is number => v !== null);
    const avg = mean(vals);
    if (avg !== null) factors.push({ name: "Check-in", value: avg < 1.7 ? "niedrig" : avg < 2.4 ? "mittel" : "gut", note: "Dein eigenes Gefühl heute Morgen", effect: avg < 1.7 ? -10 : avg < 2.4 ? -3 : 3 });
  }

  const di = data.diary.find((d) => d.day === day) ?? data.diary.find((d) => d.day === addDays(day, -1));
  if (di) {
    const strong = Object.values(di.symptoms ?? {}).filter((v) => v >= 3).length;
    const mid = Object.values(di.symptoms ?? {}).filter((v) => v === 2).length;
    const night = di.symptoms?.nacht ?? 0;
    const eff = -Math.min(12, strong * 4 + mid * 2 + (night >= 2 ? 3 : 0));
    if (eff < 0) factors.push({ name: "Symptome", value: strong ? `${strong} stark` : `${mid} mittel`, note: di.day === day ? "aus dem Tagebuch von heute" : "aus dem Tagebuch von gestern", effect: eff });
  }

  const cyc = cycleInfo(day, data.diary);
  if (cyc.cycleDay !== null) {
    const p = cyclePattern(data);
    const lowBefore = p.ready && p.beforeDiff !== null && p.beforeDiff < -5;
    factors.push({
      name: `Zyklustag ${cyc.cycleDay}`,
      value: cyc.beforePeriod ? "vor der Periode" : cyc.cycleDay <= 5 ? "Periode" : "",
      note: cyc.beforePeriod && lowBefore ? "Deine HRV ist in diesen Tagen meist niedriger" : "Kein Abzug, deine Daten zeigen hier keinen Unterschied",
      effect: cyc.beforePeriod && lowBefore ? -5 : 0,
    });
  }

  const pause = !!data.illness && illnessRule(data.illness).stop;
  if (data.illness) factors.push({ name: data.illness.label, value: `Stärke ${data.illness.severity}`, note: pause ? "Pause statt Training" : "Nur leichte Bewegung", effect: pause ? -100 : -25 });

  const enoughData = hist.length >= 14; // ab 14 Tagen gibt es persönliche Bereiche
  const score = Math.max(0, Math.min(100, 80 + factors.reduce((s, f) => s + f.effect, 0)));
  if (pause) return { score: 0, label: "Pause", lo: 0, hi: 15, factors, pause, enoughData };
  const band = BANDS.find((b) => score >= b.min)!;
  return { score, label: band.label, lo: band.lo, hi: band.hi, factors, pause, enoughData };
}

export function sportAdvice(t: Target, injuredSports: string[]): { sport: string; tip: string }[] {
  if (t.pause) return [{ sport: "Heute", tip: "Pause, Erholung geht vor" }];
  const hard = t.hi >= 85;
  const easy = t.hi <= 45;
  const climb = injuredSports.includes("klettern") ? "Pause wegen Verletzung" : hard ? "Projekt probieren" : easy ? "weit unter Projekt, Technik" : "1–2 Grade unter Projekt";
  return [
    { sport: "Bouldern", tip: climb },
    { sport: "Kettlebell", tip: hard ? "wie geplant" : easy ? "leichtere Kettlebell, Technik" : "wie geplant, ohne Zusatzsätze" },
    { sport: "Karate", tip: hard ? "Kumite möglich" : easy ? "Kata und Kihon locker" : "Kata statt hartes Kumite" },
    { sport: "Ausdauer", tip: hard ? "Intervalle möglich" : easy ? "locker gehen" : "ruhiges Tempo" },
  ];
}

// ---------- Muster

export type Pattern = { key: string; title: string; ready: boolean; need: string; text: string; bars: { label: string; value: number; display: string; highlight?: boolean }[]; basis: string };

const dailyMap = (data: Data) => new Map(data.daily.map((r) => [r.day, r]));

// HRV vor der Periode gegen den Rest des Zyklus
export function cyclePattern(data: Data): { ready: boolean; beforeDiff: number | null; phases: { label: string; hrv: number | null; rhr: number | null; n: number }[]; cycles: number } {
  const dm = dailyMap(data);
  const starts = periodStarts(data.diary);
  const phases = [
    { label: "Periode", from: 1, to: 5 },
    { label: "Tag 6–13", from: 6, to: 13 },
    { label: "Tag 14–20", from: 14, to: 20 },
    { label: "vor der Periode", from: -5, to: -1 },
  ];
  const buckets = phases.map(() => ({ hrv: [] as number[], rhr: [] as number[] }));
  let cycles = 0;
  for (let i = 0; i < starts.length - 1; i++) {
    const len = Math.round((new Date(starts[i + 1]).getTime() - new Date(starts[i]).getTime()) / 864e5);
    if (len < 15 || len > 60) continue;
    cycles++;
    for (let d = 1; d <= len; d++) {
      const day = addDays(starts[i], d - 1);
      const r = dm.get(day);
      if (!r) continue;
      const fromEnd = d - len - 1; // -1 = letzter Tag vor der nächsten Periode
      phases.forEach((p, idx) => {
        const hit = p.from > 0 ? d >= p.from && d <= p.to && fromEnd < -5 : fromEnd >= p.from && fromEnd <= p.to;
        if (hit) {
          if (r.hrv_last_night !== null) buckets[idx].hrv.push(r.hrv_last_night);
          if (r.resting_hr !== null) buckets[idx].rhr.push(r.resting_hr);
        }
      });
    }
  }
  const out = phases.map((p, i) => ({ label: p.label, hrv: mean(buckets[i].hrv), rhr: mean(buckets[i].rhr), n: buckets[i].hrv.length }));
  const before = out[3].hrv;
  const rest = mean([...buckets[0].hrv, ...buckets[1].hrv, ...buckets[2].hrv]);
  const ready = cycles >= 2 && out.every((o) => o.n >= 3);
  return { ready, beforeDiff: before !== null && rest ? ((before - rest) / rest) * 100 : null, phases: out, cycles };
}

export function patterns(data: Data): Pattern[] {
  const out: Pattern[] = [];
  const dm = dailyMap(data);
  const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

  // 1. Zyklus und HRV
  const cp = cyclePattern(data);
  out.push({
    key: "zyklus",
    title: "HRV im Zyklus",
    ready: cp.ready,
    need: `Braucht mindestens 2 vollständige Zyklen mit Blutung im Tagebuch und Garmin-Daten (bisher ${cp.cycles}).`,
    text:
      cp.beforeDiff === null
        ? ""
        : Math.abs(cp.beforeDiff) < 5
          ? "Deine HRV bleibt über den Zyklus ziemlich gleich. Die Zyklusphase muss bei der Trainingsplanung also kaum mitreden."
          : `In den 5 Tagen vor der Periode liegt deine HRV im Schnitt ${Math.abs(Math.round(cp.beforeDiff))} % ${cp.beforeDiff < 0 ? "niedriger" : "höher"} als im Rest des Zyklus.${cp.beforeDiff < 0 ? " Plane in diesen Tagen eher leichtere Einheiten." : ""}`,
    bars: cp.phases.map((p) => ({ label: p.label, value: p.hrv ?? 0, display: p.hrv === null ? "–" : Math.round(p.hrv) + " ms", highlight: p.label === "vor der Periode" })),
    basis: `${cp.cycles} Zyklen`,
  });

  // 2. Harte Tage und die Nacht danach
  const hardDays: string[] = [];
  const otherDays: string[] = [];
  for (const r of data.daily) {
    const l = loadPercent(r.day, data.daily, data.acts);
    (l >= 70 ? hardDays : otherDays).push(r.day);
  }
  const nextScore = (days: string[]) => days.map((d) => dm.get(addDays(d, 1))?.sleep_score ?? null).filter((v): v is number => v !== null);
  const nextHrv = (days: string[]) => days.map((d) => dm.get(addDays(d, 1))?.hrv_last_night ?? null).filter((v): v is number => v !== null);
  const hs = mean(nextScore(hardDays));
  const os = mean(nextScore(otherDays));
  const hh = mean(nextHrv(hardDays));
  const oh = mean(nextHrv(otherDays));
  const ready2 = nextScore(hardDays).length >= 5 && nextScore(otherDays).length >= 5;
  out.push({
    key: "nacht",
    title: "Harte Tage und die Nacht danach",
    ready: ready2,
    need: `Braucht mindestens 5 harte Trainingstage mit Schlafdaten in der Nacht danach (bisher ${nextScore(hardDays).length}).`,
    text:
      hs !== null && os !== null && hh !== null && oh !== null
        ? `Nach harten Tagen liegt dein Schlafwert im Schnitt bei ${Math.round(hs)} statt ${Math.round(os)}, die HRV bei ${Math.round(hh)} statt ${Math.round(oh)} ms.${hh < oh * 0.93 ? " Nach einem harten Tag tut dir ein leichter Tag gut." : ""}`
        : "",
    bars: [
      { label: "Schlaf nach hartem Tag", value: hs ?? 0, display: hs === null ? "–" : String(Math.round(hs)), highlight: true },
      { label: "Schlaf sonst", value: os ?? 0, display: os === null ? "–" : String(Math.round(os)) },
    ],
    basis: `${hardDays.length} harte Tage`,
  });

  // 3. Bedarfs-Hübe nach Situation
  const hubCount = new Map<string, number>();
  for (const h of data.hubs) hubCount.set(h.day, (hubCount.get(h.day) ?? 0) + 1);
  const sportDays = new Map<Sport, Set<string>>();
  for (const a of data.acts) {
    const sp = sportOf(a);
    const k: Sport = a.type_key && /run/.test(a.type_key) ? "ausdauer" : sp;
    if (!sportDays.has(k)) sportDays.set(k, new Set());
    sportDays.get(k)!.add((a.start_local ?? "").slice(0, 10));
  }
  const allDays = data.daily.map((r) => r.day);
  const restDays = allDays.filter((d) => ![...sportDays.values()].some((s) => s.has(d)));
  const beforeDays = allDays.filter((d) => cycleInfo(d, data.diary).beforePeriod);
  const rate = (days: string[]) => (days.length ? days.reduce((s, d) => s + (hubCount.get(d) ?? 0), 0) / days.length : null);
  const groups: { label: string; days: string[] }[] = [
    { label: "Ausdauer", days: [...(sportDays.get("ausdauer") ?? [])] },
    { label: "Bouldern", days: [...(sportDays.get("klettern") ?? [])] },
    { label: "Karate", days: [...(sportDays.get("karate") ?? [])] },
    { label: "Kettlebell", days: [...(sportDays.get("kettlebell") ?? [])] },
    { label: "Ruhetag", days: restDays },
    { label: "vor der Periode", days: beforeDays },
  ].filter((g) => g.days.length >= 3);
  const rates = groups.map((g) => ({ label: g.label, r: rate(g.days) ?? 0, n: g.days.length }));
  const top = [...rates].sort((a, b) => b.r - a.r)[0];
  const ready3 = data.hubs.length >= 6 && rates.length >= 2;
  out.push({
    key: "hub",
    title: "Bufori-Bedarf nach Situation",
    ready: ready3,
    need: `Braucht mindestens 6 Bedarfs-Hübe und Garmin-Aktivitäten (bisher ${data.hubs.length} Hübe).`,
    text: top && top.r > 0 ? `Am häufigsten brauchst du einen Bedarfs-Hub an Tagen mit ${top.label}: im Schnitt ${top.r.toFixed(1).replace(".", ",")} pro Tag. Dann vorher länger aufwärmen und das Mundausspülen nicht vergessen.` : "Bisher keine Häufung an bestimmten Tagen.",
    bars: rates.map((r) => ({ label: r.label, value: r.r, display: r.r.toFixed(1).replace(".", ","), highlight: r === top })),
    basis: `${data.hubs.length} Bedarfs-Hübe`,
  });

  // 4. Einflüsse und Nächte
  const infl = INFLUENCES.map((f) => f.key);
  const labels: Record<string, string> = Object.fromEntries(INFLUENCES.map((f) => [f.key, f.label]));
  const rows: { label: string; with: number; without: number; n: number }[] = [];
  for (const k of infl) {
    const withD = data.diary.filter((d) => d.influences?.includes(k)).map((d) => d.day);
    const withoutD = data.diary.filter((d) => !d.garminOnly && !d.influences?.includes(k)).map((d) => d.day);
    const sleep = (days: string[]) => days.map((d) => dm.get(addDays(d, 1))?.sleep_score ?? null).filter((v): v is number => v !== null);
    const a = mean(sleep(withD));
    const b = mean(sleep(withoutD));
    if (withD.length >= 4 && withoutD.length >= 4 && a !== null && b !== null) rows.push({ label: labels[k], with: a, without: b, n: withD.length });
  }
  const worst = [...rows].sort((x, y) => x.with - x.without - (y.with - y.without))[0];
  out.push({
    key: "einfluss",
    title: "Gewohnheiten und Schlaf",
    ready: rows.length > 0,
    need: "Braucht mindestens 4 Tage mit einem Einfluss im Tagebuch und Schlafdaten in der Nacht danach.",
    text:
      worst && worst.with < worst.without - 2
        ? `Nach Tagen mit „${worst.label}“ liegt dein Schlafwert im Schnitt bei ${Math.round(worst.with)} statt ${Math.round(worst.without)} (${pct(worst.with, worst.without)} %).`
        : "Bisher zeigt keine der Gewohnheiten einen deutlichen Unterschied beim Schlaf.",
    bars: rows.map((r) => ({ label: r.label, value: r.with, display: `${Math.round(r.with)} statt ${Math.round(r.without)}`, highlight: r === worst })),
    basis: rows.map((r) => `${r.label} ${r.n}×`).join(", ") || "noch keine",
  });

  // 5. Gefühl gegen Messwert
  const pairs = data.checkins
    .map((c) => ({ c, d: dm.get(c.day) }))
    .filter((p) => p.c.energy !== null && p.d?.bb_max !== null && p.d?.bb_max !== undefined);
  const byEnergy = [1, 2, 3].map((e) => mean(pairs.filter((p) => p.c.energy === e).map((p) => p.d!.bb_max as number)));
  out.push({
    key: "gefuehl",
    title: "Gefühl gegen Messwert",
    ready: pairs.length >= 10,
    need: `Braucht mindestens 10 Morgen-Check-ins mit Body Battery (bisher ${pairs.length}).`,
    text:
      byEnergy[0] !== null && byEnergy[2] !== null
        ? byEnergy[2]! - byEnergy[0]! > 15
          ? "Dein Gefühl und die Body Battery passen gut zusammen. Du kannst dich auf dein Energiegefühl verlassen."
          : "Dein Energiegefühl und die Body Battery gehen oft auseinander. Dann lohnt es sich, beides anzuschauen, bevor du hart trainierst."
        : "Noch nicht genug Tage mit niedriger und guter Energie zum Vergleichen.",
    bars: ["niedrig", "mittel", "gut"].map((l, i) => ({ label: `Energie ${l}`, value: byEnergy[i] ?? 0, display: byEnergy[i] === null ? "–" : String(Math.round(byEnergy[i]!)) })),
    basis: `${pairs.length} Check-ins`,
  });

  return out;
}

// Einträge, die nur garmin-sync angelegt hat (manual = false), zählen in Auswertungen nicht als eigener Tagebuch-Tag
export function markAutoRows<T extends { manual?: boolean | null }>(rows: T[]): (T & { garminOnly?: boolean })[] {
  return rows.map((r) => (r.manual === false ? { ...r, garminOnly: true } : r));
}
