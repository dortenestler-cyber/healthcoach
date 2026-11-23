// Leichte Anzeichen (Sammelliste Punkt 19): Frühwarnung auf Heute, Frage „Bist du krank?“, Muster.
// Reine Berechnungen ohne Netzwerk. Keine Diagnose: nur Zusammenhänge mit den eigenen Werten.

import { metricBaseline, positionIn, type BaseCtx } from "@/lib/baseline";
import { SIGN_KEYS, SIGNS, symptomLabel } from "@/lib/catalog";
import { METRICS, type MetricKey } from "@/lib/garmin";
import type { Data, Diary } from "@/lib/insights";
import { analyze, conditions, type Analysis, type MusterExtra } from "@/lib/muster";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Anzeichen eines Tages mit Stärke (1–3)
export function signsOf(e: Diary | undefined): { key: string; label: string; level: number }[] {
  if (!e?.symptoms) return [];
  return SIGNS.filter((s) => (e.symptoms[s.key] ?? 0) > 0).map((s) => ({ key: s.key, label: s.phrase, level: e.symptoms[s.key] }));
}
const sum = (e: Diary | undefined) => signsOf(e).reduce((a, s) => a + s.level, 0);

export const signDays = (diary: Diary[]) => new Set(diary.filter((e) => Object.entries(e.symptoms ?? {}).some(([k, v]) => SIGN_KEYS.has(k) && v > 0)).map((e) => e.day));

// Frühwarnung: Anzeichen heute oder gestern, dazu HRV unter dem Bereich, Ruhepuls oder Temperatur darüber
export type SignHint = { day: string; signs: string[]; values: string[]; text: string };

const WATCH: { key: MetricKey; bad: "unter" | "über"; word: string }[] = [
  { key: "hrv", bad: "unter", word: "HRV unter deinem Bereich" },
  { key: "ruhepuls", bad: "über", word: "Ruhepuls über deinem Bereich" },
  { key: "temperatur", bad: "über", word: "Hauttemperatur über deinem Bereich" },
];

export function signHint(data: Data, today: string): SignHint | null {
  if (data.illness) return null; // krank: dafür gibt es die Krankheitskarte
  const byDay = new Map(data.diary.map((e) => [e.day, e]));
  const day = signsOf(byDay.get(today)).length ? today : signsOf(byDay.get(addDays(today, -1))).length ? addDays(today, -1) : null;
  if (!day) return null;
  const signs = signsOf(byDay.get(day)).sort((a, b) => b.level - a.level).map((s) => s.label);
  const ctx: BaseCtx = { diary: data.diary, sick: data.sick };
  const row = data.daily.find((r) => r.day === today);
  const values: string[] = [];
  if (row) {
    for (const w of WATCH) {
      const v = METRICS[w.key].value(row);
      const b = metricBaseline(w.key, data.daily, ctx, today).active;
      if (v !== null && b && positionIn(v, b) === w.bad) values.push(w.word);
    }
  }
  const list = signs.slice(0, 2).join(" und ");
  const head = list[0].toUpperCase() + list.slice(1);
  const text = values.length
    ? `${head}${day === today ? "" : " seit gestern"}, dazu ${values.join(" und ")}. Heute lieber locker trainieren und früh schlafen.`
    : `${head}${day === today ? "" : " seit gestern"}. Deine Werte sind noch im Bereich, hör trotzdem auf deinen Körper.`;
  return { day, signs, values, text };
}

// „Bist du krank?“: Anzeichen an zwei Tagen in Folge, heute stärker als gestern. Beginn = erster Tag der Folge mit Anzeichen.
export function sickQuestion(data: Data, today: string): { since: string; suggest: string } | null {
  if (data.illness) return null;
  const byDay = new Map(data.diary.map((e) => [e.day, e]));
  const t = sum(byDay.get(today));
  const y = sum(byDay.get(addDays(today, -1)));
  if (!t || !y || t <= y) return null;
  let since = addDays(today, -1);
  while (sum(byDay.get(addDays(since, -1))) > 0) since = addDays(since, -1);
  const keys = signsOf(byDay.get(today)).map((s) => s.key);
  const cold = keys.some((k) => ["hals_rau", "halsweh", "nase_zu", "schnupfen", "niesen", "husten"].includes(k));
  return { since, suggest: cold ? "erkaeltung" : "grippal" };
}

// Muster: Wann kommen Anzeichen häufiger? Ohne Zyklus (steht auf Zyklus) und ohne Krankheitstage.
export function signAnalysis(data: Data, extra: MusterExtra, today: string): Analysis {
  const conds = conditions(data, extra).filter((c) => c.group !== "zyklus" && c.key !== "krank");
  return analyze(signDays(data.diary), conds, today, "Anzeichen");
}

export { symptomLabel };
