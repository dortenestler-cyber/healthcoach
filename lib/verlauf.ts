// Detailansicht (Verlauf): Zeiträume T · W · M · 6M · J, ab 6M Wochenmittel, Satz und Highlights je Zeitraum.
// Reine Berechnungen ohne Netzwerk. Der persönliche Bereich kommt fest aus lib/baseline.ts und hängt nicht am Zeitraum.

import { positionIn, type Range } from "@/lib/baseline";

export type Span = "T" | "W" | "M" | "6M" | "J";

export const SPANS: { key: Span; label: string; name: string; days: number; weekly: boolean }[] = [
  { key: "T", label: "T", name: "Tag", days: 1, weekly: false },
  { key: "W", label: "W", name: "Woche", days: 7, weekly: false },
  { key: "M", label: "M", name: "Monat", days: 30, weekly: false },
  { key: "6M", label: "6M", name: "Halbjahr", days: 182, weekly: true },
  { key: "J", label: "J", name: "Jahr", days: 365, weekly: true },
];

export const spanOf = (k: Span) => SPANS.find((s) => s.key === k)!;

export type Point = { day: string; label: string; value: number | null; n: number };

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const date = (iso: string) => new Date(iso + "T12:00:00");
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export const dayLabel = (iso: string) => `${date(iso).getDate()}. ${MONTHS[date(iso).getMonth()]}`;

// Tage des Zeitraums bis einschließlich heute
export function spanDays(span: Span, today: string): string[] {
  const n = spanOf(span).days;
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

// Punkte für das Diagramm: Tage oder (ab 6M) Wochenmittel, Woche beginnt am Montag
export function buildPoints(span: Span, today: string, value: (day: string) => number | null): Point[] {
  const days = spanDays(span, today);
  if (!spanOf(span).weekly) {
    return days.map((d) => {
      const v = value(d);
      return { day: d, label: span === "W" ? WD[date(d).getDay()] : dayLabel(d), value: v, n: v === null ? 0 : 1 };
    });
  }
  const weeks = new Map<string, number[]>();
  for (const d of days) {
    const wd = (date(d).getDay() + 6) % 7; // Montag = 0
    const monday = addDays(d, -wd);
    if (!weeks.has(monday)) weeks.set(monday, []);
    const v = value(d);
    if (v !== null) weeks.get(monday)!.push(v);
  }
  return [...weeks.entries()].map(([monday, vals]) => ({ day: monday, label: MONTHS[date(monday).getMonth()], value: mean(vals), n: vals.length }));
}

// Beschriftung der x-Achse: Anfang, Mitte, Ende (bei 6M und J Monatsnamen)
export function axisLabels(points: Point[], span: Span): { index: number; text: string }[] {
  if (!points.length) return [];
  if (span === "W") return points.map((p, i) => ({ index: i, text: p.label }));
  const last = points.length - 1;
  const idx = [0, Math.round(last / 2), last];
  return idx.map((i) => ({ index: i, text: i === last && !spanOf(span).weekly ? "heute" : points[i].label }));
}

// ---------- Satz und Highlights

export type Highlight = { label: string; value: string };

export function summarize(
  span: Span,
  points: Point[],
  range: Range | null, // Bereich, der heute gilt (Satz bei T)
  rangeFor: (day: string) => Range | null, // Bereich je Tag: Luteal-Tage gegen den Luteal-Bereich, sonst 30 Tage
  fmt: (v: number) => string,
  label: string,
  sweatNights: number,
): { sentence: string; big: string | null; bigNote: string; highlights: Highlight[] } {
  const withValue = points.filter((p) => p.value !== null) as (Point & { value: number })[];
  if (!withValue.length) return { sentence: `${label}: in diesem Zeitraum noch keine Werte.`, big: null, bigNote: "", highlights: [] };
  const avg = mean(withValue.map((p) => p.value))!;
  const lastP = withValue[withValue.length - 1];
  const highlights: Highlight[] = [];
  let sentence = "";

  if (span === "T") {
    const pos = range ? positionIn(lastP.value, range) : null;
    sentence = !range ? `${label} heute. Dein Bereich entsteht ab 14 Tagen Daten.` : pos === "im" ? `${label} liegt heute in deinem Bereich.` : `${label} liegt heute ${pos} deinem Bereich.`;
    return { sentence, big: fmt(lastP.value), bigNote: "heute", highlights };
  }

  if (spanOf(span).weekly) {
    // Trend: die ersten 4 Wochen gegen die letzten 4 Wochen
    const first = mean(withValue.slice(0, 4).map((p) => p.value));
    const last = mean(withValue.slice(-4).map((p) => p.value));
    const width = range ? range.hi - range.lo : null;
    if (first !== null && last !== null && withValue.length >= 8) {
      const diff = last - first;
      const same = width !== null ? Math.abs(diff) < width / 2 : Math.abs(diff) < Math.abs(first) * 0.05;
      sentence = same ? `${label} ist im ${spanOf(span).name} etwa gleich geblieben.` : `${label} ist im ${spanOf(span).name} ${diff > 0 ? "gestiegen" : "gesunken"}: von ${fmt(first)} auf ${fmt(last)} im Wochenschnitt.`;
      highlights.push({ label: "Erste 4 Wochen", value: fmt(first) }, { label: "Letzte 4 Wochen", value: fmt(last) });
    } else sentence = `${label}: für einen Trend fehlen noch Wochen.`;
  } else if (range) {
    const rated = withValue.filter((p) => rangeFor(p.day) !== null);
    const inRange = rated.filter((p) => positionIn(p.value, rangeFor(p.day) as Range) === "im").length;
    sentence = `${label} lag an ${inRange} von ${rated.length} Tagen in deinem Bereich.`;
    highlights.push({ label: "Tage im Bereich", value: `${inRange} von ${rated.length}` });
  } else sentence = `${label} im Schnitt ${fmt(avg)}. Dein Bereich entsteht ab 14 Tagen Daten.`;

  const max = withValue.reduce((a, b) => (b.value > a.value ? b : a));
  const min = withValue.reduce((a, b) => (b.value < a.value ? b : a));
  const when = (p: Point) => (spanOf(span).weekly ? `Woche ab ${dayLabel(p.day)}` : dayLabel(p.day));
  highlights.push({ label: `Höchster Wert · ${when(max)}`, value: fmt(max.value) }, { label: `Niedrigster Wert · ${when(min)}`, value: fmt(min.value) });
  if (sweatNights) highlights.push({ label: "Nächte mit Nachtschweiß", value: String(sweatNights) });

  return { sentence, big: fmt(avg), bigNote: spanOf(span).weekly ? "Schnitt der Wochen" : "Schnitt", highlights };
}
