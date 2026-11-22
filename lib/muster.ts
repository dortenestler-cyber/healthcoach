// Muster-Motor: Wie oft passiert ein Ereignis (zum Beispiel ein Abend mit Wadenkrampf) an Tagen mit einer Bedingung,
// wie oft an Tagen ohne? Reine Berechnungen ohne Netzwerk. Zusammenhänge, keine Ursachen, keine Diagnosen.
// Konzept: docs/konzept-wadenkraempfe.md

import { INFLUENCES } from "@/lib/catalog";
import { cycleToday, groupOf, type PhaseGroup } from "@/lib/cycle";
import type { Illness } from "@/lib/health";
import { cycleInfo, loadPercent, type Data } from "@/lib/insights";
import { load7 } from "@/lib/today";
import { sportOfGarmin } from "@/lib/training";

export const MIN_EVENT_DAYS = 8; // so viele Tage mit Ereignis braucht die Auswertung
export const MIN_GROUP_DAYS = 4; // so viele Tage braucht jede Seite eines Vergleichs
export const MIN_RATIO = 2; // mindestens doppelt (oder halb) so häufig
export const MIN_EXTRA = 3; // und mindestens 3 Ereignistage auf der häufigeren Seite
export const MAX_FINDINGS = 3;

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---------- Daten für Muskelereignisse

export type MuscleDay = { day: string; intensity: number; situation: string; swelling: boolean; numbness: boolean };
export type MedIntake = { day: string; name: string };

export type MusterExtra = {
  muscle: MuscleDay[];
  intakes: MedIntake[]; // regelmäßige Einnahmen mit Namen des Mittels
  illnesses: Illness[]; // auch abgeschlossene
};

// ---------- Bedingungen

export type Condition = { key: string; group: "zyklus" | "training" | "erholung" | "tagebuch" | "gesundheit" | "einnahme"; label: string; has: (day: string) => boolean; from?: string };

const quantile = (v: number[], q: number) => {
  if (v.length < 14) return null;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * q)];
};

export function conditions(data: Data, extra: MusterExtra): Condition[] {
  const out: Condition[] = [];
  const dm = new Map(data.daily.map((r) => [r.day, r]));
  const diary = new Map(data.diary.map((d) => [d.day, d]));
  const groupCache = new Map<string, PhaseGroup | null>();
  const group = (d: string) => {
    if (!groupCache.has(d)) groupCache.set(d, groupOf(cycleToday(d, data.diary).phase));
    return groupCache.get(d)!;
  };

  // Zyklus
  out.push({ key: "vor_periode", group: "zyklus", label: "die 5 Tage vor der Periode", has: (d) => cycleInfo(d, data.diary).beforePeriod });
  out.push({ key: "menstruation", group: "zyklus", label: "Tage der Menstruation", has: (d) => group(d) === "menstruation" });
  out.push({ key: "follikel", group: "zyklus", label: "Tage der Follikelphase", has: (d) => group(d) === "follikel" });
  out.push({ key: "luteal", group: "zyklus", label: "Tage der Lutealphase", has: (d) => group(d) === "luteal" });

  // Training am selben Tag (der Krampf kommt meist am Abend danach)
  out.push({ key: "hart", group: "training", label: "Tage mit hoher Belastung", has: (d) => loadPercent(d, data.daily, data.acts) >= 70 });
  const sportDays = new Map<string, Set<string>>();
  for (const a of data.acts) {
    const k = a.type_key && /run/.test(a.type_key) ? "ausdauer" : sportOfGarmin(a.type_key);
    if (!sportDays.has(k)) sportDays.set(k, new Set());
    sportDays.get(k)!.add((a.start_local ?? "").slice(0, 10));
  }
  const sports: [string, string][] = [["ausdauer", "Tage mit Ausdauer"], ["klettern", "Bouldertage"], ["karate", "Karatetage"], ["kettlebell", "Kettlebell-Tage"]];
  for (const [k, label] of sports) if (sportDays.has(k)) out.push({ key: "sport_" + k, group: "training", label, has: (d) => sportDays.get(k)!.has(d) });
  if (data.acts.length) {
    const any = new Set([...sportDays.values()].flatMap((s) => [...s]));
    out.push({ key: "ruhetag", group: "training", label: "Ruhetage", has: (d) => !any.has(d) });
    out.push({
      key: "woche_hoch",
      group: "training",
      label: "Tage nach einer Woche mit hoher Belastung",
      has: (d) => {
        const l = load7(d, data);
        return l.value !== null && l.range !== null && l.value > l.range.hi;
      },
    });
  }

  // Erholung: Werte der Nacht davor gegen den eigenen Bereich (unteres oder oberes Viertel)
  const vals = (f: (r: (typeof data.daily)[number]) => number | null) => data.daily.map(f).filter((v): v is number => v !== null);
  const sleepLo = quantile(vals((r) => r.sleep_score), 0.25);
  const hrvLo = quantile(vals((r) => r.hrv_last_night), 0.25);
  const rhrHi = quantile(vals((r) => r.resting_hr), 0.75);
  if (sleepLo !== null) out.push({ key: "schlaf_schlecht", group: "erholung", label: "Tage nach einer schlechten Nacht", has: (d) => (dm.get(d)?.sleep_score ?? Infinity) < sleepLo });
  if (hrvLo !== null) out.push({ key: "hrv_niedrig", group: "erholung", label: "Tage mit niedriger HRV", has: (d) => (dm.get(d)?.hrv_last_night ?? Infinity) < hrvLo });
  if (rhrHi !== null) out.push({ key: "ruhepuls_hoch", group: "erholung", label: "Tage mit erhöhtem Ruhepuls", has: (d) => (dm.get(d)?.resting_hr ?? -Infinity) > rhrHi });

  // Tagebuch
  for (const f of INFLUENCES) out.push({ key: "einfluss_" + f.key, group: "tagebuch", label: `Tage mit „${f.label}“`, has: (d) => !!diary.get(d)?.influences?.includes(f.key) });
  out.push({ key: "nachtschweiss", group: "tagebuch", label: "Tage mit Nachtschweiß", has: (d) => (diary.get(d)?.symptoms?.nacht ?? 0) > 0 });
  out.push({ key: "hitze", group: "tagebuch", label: "Tage mit Hitzewallungen", has: (d) => (diary.get(d)?.symptoms?.hitze ?? 0) > 0 });

  // Gesundheit
  if (extra.illnesses.length) {
    const ill = (d: string) => extra.illnesses.some((i) => d >= i.started_on && (!i.ended_on || d <= i.ended_on));
    out.push({ key: "krank", group: "gesundheit", label: "Krankheitstage", has: ill });
  }

  // Einnahmen: je Mittel Tage mit Einnahme gegen Tage ohne
  const byMed = new Map<string, Set<string>>();
  for (const i of extra.intakes) {
    if (!byMed.has(i.name)) byMed.set(i.name, new Set());
    byMed.get(i.name)!.add(i.day);
  }
  // Erst ab der ersten eingetragenen Einnahme vergleichen, sonst zählen Tage ohne Abhaken als „ohne“
  for (const [name, days] of byMed) out.push({ key: "einnahme_" + name, group: "einnahme", label: `Tage mit ${name}`, has: (d) => days.has(d), from: [...days].sort()[0] });
  return out;
}

// ---------- Vergleich

export type Finding = {
  key: string;
  group: Condition["group"];
  label: string;
  withDays: number;
  withEvents: number;
  withoutDays: number;
  withoutEvents: number;
  ratio: number; // Anteil mit / Anteil ohne
  more: boolean; // häufiger unter der Bedingung
  today: boolean; // Bedingung gilt heute
  text: string;
};

export type Analysis = {
  ready: boolean;
  eventDays: number;
  windowDays: number;
  since: string | null;
  findings: Finding[]; // die stärksten, höchstens MAX_FINDINGS je Bereich-Auswahl
  checked: number; // wie viele Bedingungen genug Tage hatten
};

const frac = (a: number, b: number) => `an ${a} von ${b} ${b === 1 ? "Tag" : "Tagen"}`;

// Vergleicht ein Ereignis mit allen Bedingungen über die Tage seit dem ersten Eintrag.
export function analyze(eventDays: Set<string>, conds: Condition[], today: string, noun: string, opts: { since?: string; maxDays?: number } = {}): Analysis {
  const first = opts.since ?? [...eventDays].sort()[0] ?? null;
  if (!first) return { ready: false, eventDays: 0, windowDays: 0, since: null, findings: [], checked: 0 };
  const startLimit = addDays(today, -((opts.maxDays ?? 180) - 1));
  const start = first > startLimit ? first : startLimit;
  const days: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d);
  const events = days.filter((d) => eventDays.has(d)).length;
  const ready = events >= MIN_EVENT_DAYS;
  const findings: Finding[] = [];
  let checked = 0;
  if (ready) {
    for (const c of conds) {
      let wd = 0, we = 0, od = 0, oe = 0;
      for (const d of days) {
        if (c.from && d < c.from) continue;
        const e = eventDays.has(d);
        if (c.has(d)) {
          wd++;
          if (e) we++;
        } else {
          od++;
          if (e) oe++;
        }
      }
      if (wd < MIN_GROUP_DAYS || od < MIN_GROUP_DAYS) continue;
      checked++;
      const rw = we / wd;
      const ro = oe / od;
      // Kein Ereignis auf einer Seite: Verhältnis mit einem halben Ereignis abschätzen, damit es nicht unendlich wird
      const ratio = (Math.max(we, 0.5) / wd) / (Math.max(oe, 0.5) / od);
      const more = rw > ro;
      const strong = more ? ratio >= MIN_RATIO && we >= MIN_EXTRA : ratio <= 1 / MIN_RATIO && oe >= MIN_EXTRA;
      if (!strong) continue;
      findings.push({
        key: c.key,
        group: c.group,
        label: c.label,
        withDays: wd,
        withEvents: we,
        withoutDays: od,
        withoutEvents: oe,
        ratio,
        more,
        today: c.has(today),
        text: `${c.label[0].toUpperCase() + c.label.slice(1)}: ${noun} ${frac(we, wd)}, sonst ${frac(oe, od)}.`,
      });
    }
  }
  findings.sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
  // Gleiche Tage unter anderem Namen (z. B. harte Tage = Ausdauertage, Ruhetage = das Gegenteil) nur einmal zeigen
  const unique: Finding[] = [];
  for (const f of findings) {
    const dup = unique.some((u) => (u.withDays === f.withDays && u.withEvents === f.withEvents) || (u.withDays === f.withoutDays && u.withEvents === f.withoutEvents));
    if (!dup) unique.push(f);
  }
  return { ready, eventDays: events, windowDays: days.length, since: start, findings: unique, checked };
}

// ---------- Wadenkrämpfe

export const muscleEventDays = (muscle: MuscleDay[], minIntensity = 1) => new Set(muscle.filter((m) => m.intensity >= minIntensity).map((m) => m.day));

export function muscleAnalysis(data: Data, extra: MusterExtra, today: string): Analysis {
  return analyze(muscleEventDays(extra.muscle), conditions(data, extra), today, "Zucken oder Krampf");
}

// Anteil der Tage mit Zucken oder Krampf je Zyklusphase, über die Tage seit dem ersten Eintrag
export function muscleByPhase(data: Data, extra: MusterExtra, today: string): { group: PhaseGroup; label: string; days: number; events: number }[] {
  const ev = muscleEventDays(extra.muscle);
  const first = [...ev].sort()[0];
  if (!first) return [];
  const rows: Record<PhaseGroup, { days: number; events: number }> = { menstruation: { days: 0, events: 0 }, follikel: { days: 0, events: 0 }, luteal: { days: 0, events: 0 } };
  const start = first > addDays(today, -179) ? first : addDays(today, -179);
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const g = groupOf(cycleToday(d, data.diary).phase);
    if (!g) continue;
    rows[g].days++;
    if (ev.has(d)) rows[g].events++;
  }
  const labels: Record<PhaseGroup, string> = { menstruation: "Menstruation", follikel: "Follikel", luteal: "Luteal" };
  return (Object.keys(rows) as PhaseGroup[]).map((g) => ({ group: g, label: labels[g], ...rows[g] }));
}

// Krampftage pro Woche (Montag bis Sonntag), älteste zuerst, mit der Zahl starker Krämpfe
export function muscleWeeks(muscle: MuscleDay[], today: string, weeks = 12): { monday: string; days: number; strong: number }[] {
  const mon = addDays(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
  const out = Array.from({ length: weeks }, (_, i) => ({ monday: addDays(mon, -7 * (weeks - 1 - i)), days: 0, strong: 0 }));
  const byDay = new Map<string, number>();
  for (const m of muscle) byDay.set(m.day, Math.max(byDay.get(m.day) ?? 0, m.intensity));
  for (const [day, max] of byDay) {
    const w = out.find((x) => day >= x.monday && day < addDays(x.monday, 7));
    if (!w) continue;
    w.days++;
    if (max >= 3) w.strong++;
  }
  return out;
}

// ---------- Warnzeichen (feste Regeln, nie aus der KI)

export type Warning = { key: string; text: string };

export function muscleWarnings(muscle: MuscleDay[], today: string): Warning[] {
  const out: Warning[] = [];
  const daysIn = (from: number, to: number) => new Set(muscle.filter((m) => m.day > addDays(today, -from) && m.day <= addDays(today, -to)).map((m) => m.day)).size;
  const recent = daysIn(28, 0);
  const before = daysIn(56, 28);
  const week = daysIn(7, 0);
  if (muscle.some((m) => m.day > addDays(today, -14) && (m.swelling || m.numbness))) {
    out.push({ key: "zeichen", text: "In den letzten zwei Wochen hast du Schwellung, Rötung, Wärme, Schwäche oder Taubheit eingetragen. Bitte zeitnah ärztlich abklären lassen. Bei plötzlicher Atemnot oder Brustschmerz: Notruf 112." });
  }
  if (week >= 5) out.push({ key: "fast_taeglich", text: `Zucken oder Krämpfe an ${week} der letzten 7 Tage. Wenn das so bleibt, bitte ärztlich abklären lassen.` });
  else if (recent >= 6 && recent >= 2 * Math.max(before, 1) && before > 0) {
    out.push({ key: "haeufiger", text: `Zucken oder Krämpfe an ${recent} Tagen in den letzten 4 Wochen, in den 4 Wochen davor an ${before}. Wenn sie häufiger werden, bitte ärztlich abklären lassen.` });
  }
  return out;
}
