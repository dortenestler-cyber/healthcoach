// Datumshilfen in der Ortszeit des Geräts.

export function isoDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function longDate(d: Date = new Date()): string {
  return `${weekdays[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
}

export function shortDate(d: Date): string {
  return `${d.getDate()}. ${months[d.getMonth()].slice(0, 3)}.`;
}

export function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Gruß nach Tageszeit (Heute und Sperrbildschirm), locker statt förmlich.
// Abend ab 17 Uhr, nachts ab 22 Uhr.
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "Morgen!";
  if (h >= 11 && h < 17) return "Hallo!";
  if (h >= 17 && h < 22) return "Schönen Abend!";
  return "Noch wach?";
}

// Tag um n Tage verschieben (ISO-Datum, Ortszeit)
export function shiftDay(day: string, n: number): string {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
