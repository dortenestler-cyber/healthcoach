// „Dieser Monat“ auf der Wert-Seite (Konzept docs/konzept-buendeln.md, Bausteine 3 und 6, Nutzerin 24.11.):
// Schnitt dieses Monats gegen den Vormonat, Tage im Bereich, bester und schwächster Tag. Reine Rechnung.

import { metricRangeSeries, type BaseCtx } from "@/lib/baseline";
import { METRICS, type Daily, type MetricKey } from "@/lib/garmin";
import { lageIn } from "@/lib/einordnung";

export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export type MonatsBlick = {
  monat: string; // „November“
  vormonat: string;
  schnitt: number | null;
  schnittVor: number | null;
  tage: number; // Tage mit Wert
  imBereich: number | null; // Tage im Bereich (null: noch kein Bereich)
  bewertet: number; // Tage mit Bereich
  bester: { day: string; v: number } | null;
  schwaechster: { day: string; v: number } | null;
  satz: string;
  deutlich: boolean; // Unterschied zum Vormonat mindestens eine halbe Bereichsbreite (für „Dein Monat“)
};

export function monatsBlick(key: MetricKey, daily: Daily[], ctx: BaseCtx, today: string): MonatsBlick {
  const m = METRICS[key];
  const d = new Date(today + "T12:00:00");
  const ym = today.slice(0, 7);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15);
  const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const vals = (p: string) => daily.filter((r) => r.day.startsWith(p) && r.day <= today).map((r) => ({ day: r.day, v: m.value(r) })).filter((x): x is { day: string; v: number } => x.v !== null);
  const now = vals(ym);
  const before = vals(ymPrev);
  const schnitt = mean(now.map((x) => x.v));
  const schnittVor = mean(before.map((x) => x.v));
  const ranges = metricRangeSeries(key, daily, ctx, now.map((x) => x.day));
  let imBereich = 0;
  let bewertet = 0;
  now.forEach((x, i) => {
    const r = ranges[i];
    if (!r) return;
    bewertet++;
    if (lageIn(x.v, r) === "im") imBereich++;
  });
  const sorted = [...now].sort((a, b) => (m.higherIsBetter ? b.v - a.v : a.v - b.v));
  const monat = MONATE[d.getMonth()];
  const vormonat = MONATE[prev.getMonth()];
  const width = ranges.filter(Boolean).map((r) => r!.hi - r!.lo);
  const halb = width.length ? (mean(width) ?? 0) / 2 : null;
  // Satz ohne Verb, das zum Wert passen muss („Schlaf liegt“, aber „Schritte liegen“)
  let satz = `${m.label}: im ${monat} noch keine Werte.`;
  let deutlich = false;
  if (schnitt !== null) {
    if (schnittVor === null) satz = `${m.label}: im ${monat} im Schnitt ${m.fmt(schnitt)}.`;
    else {
      const diff = schnitt - schnittVor;
      // Deutlich: mindestens eine halbe Bereichsbreite (ohne Bereich 10 %) und nach dem Runden sichtbar
      const schwelle = halb !== null && halb > 0 ? halb : Math.abs(schnittVor) * 0.1;
      deutlich = diff !== 0 && Math.abs(diff) >= schwelle && m.fmt(schnitt) !== m.fmt(schnittVor);
      satz = deutlich
        ? `${m.label}: im ${monat} im Schnitt ${m.fmt(schnitt)}, ${diff > 0 ? "höher" : "niedriger"} als im ${vormonat} (${m.fmt(schnittVor)}).`
        : `${m.label}: im ${monat} im Schnitt ${m.fmt(schnitt)}, etwa wie im ${vormonat}.`;
    }
  }
  return { monat, vormonat, schnitt, schnittVor, tage: now.length, imBereich: bewertet ? imBereich : null, bewertet, bester: sorted[0] ?? null, schwaechster: sorted.length > 1 ? sorted[sorted.length - 1] : null, satz, deutlich };
}
