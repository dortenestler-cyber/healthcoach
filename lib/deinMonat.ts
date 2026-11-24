// „Dein Monat“ auf Gesundheit › Überblick (Konzept docs/konzept-buendeln.md, Baustein 6, Nutzerin 24.11.):
// nur was sich gegenüber dem Vormonat deutlich verändert hat, je ein Satz mit Link zur Wert-Seite.
// Werte: Schnitt des Monats bis heute gegen den ganzen Vormonat (lib/monat.ts, deutlich = halbe Bereichsbreite).
// Training und Gewohnheiten: Anzahl bis heute gegen dieselben Tage im Vormonat (fair, auch mitten im Monat).

import type { MetricKey } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { monatsBlick, MONATE } from "@/lib/monat";
import { sportOf, SPORTS, type Sport } from "@/lib/training";

export type MonatsZeile = { key: string; text: string; href: string };

const WERTE: MetricKey[] = ["hrv", "ruhepuls", "schlaf", "stress", "belastung", "schritte"];
const SPORTARTEN: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];

export function deinMonat(data: Data, today: string, habitLabel: (key: string) => string): { monat: string; vormonat: string; zeilen: MonatsZeile[] } {
  const d = new Date(today + "T12:00:00");
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15);
  const ym = today.slice(0, 7);
  const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const bisTag = today.slice(8, 10);
  const inNow = (day: string) => day.startsWith(ym) && day <= today;
  const inPrev = (day: string) => day.startsWith(ymPrev) && day.slice(8, 10) <= bisTag;
  const monat = MONATE[d.getMonth()];
  const vormonat = MONATE[prev.getMonth()];
  const zeilen: MonatsZeile[] = [];

  for (const k of WERTE) {
    const b = monatsBlick(k, data.daily, { diary: data.diary, sick: data.sick }, today);
    if (b.deutlich && b.schnittVor !== null) zeilen.push({ key: k, text: b.satz, href: `/wert/${k}` });
  }

  // Training: Tage je Sportart (Garmin oder im Kalender erfasst)
  for (const sp of SPORTARTEN) {
    const days = new Set([...data.acts.filter((a) => sportOf(a) === sp).map((a) => (a.start_local ?? "").slice(0, 10)), ...(data.done ?? []).filter((s) => s.sport === sp).map((s) => s.day)]);
    const now = [...days].filter(inNow).length;
    const before = [...days].filter(inPrev).length;
    if (Math.abs(now - before) >= 2) zeilen.push({ key: "sport-" + sp, text: `${SPORTS[sp].label} im ${monat} ${now}-mal, im ${vormonat} bis zum ${Number(bisTag)}. ${before}-mal.`, href: "/training" });
  }

  // Gewohnheiten aus dem Tagebuch
  const counts = new Map<string, { now: number; before: number }>();
  for (const e of data.diary) {
    const n = inNow(e.day), p = inPrev(e.day);
    if (!n && !p) continue;
    for (const k of e.influences ?? []) {
      const c = counts.get(k) ?? { now: 0, before: 0 };
      if (n) c.now++;
      else c.before++;
      counts.set(k, c);
    }
  }
  for (const [k, c] of counts) {
    if (Math.abs(c.now - c.before) >= 3) zeilen.push({ key: "gew-" + k, text: `${habitLabel(k)} im ${monat} ${c.now}-mal, im ${vormonat} bis zum ${Number(bisTag)}. ${c.before}-mal.`, href: `/wert/gewohnheit-${encodeURIComponent(k)}` });
  }
  return { monat, vormonat, zeilen };
}
