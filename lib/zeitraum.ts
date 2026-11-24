// Zeitraum (Konzept docs/konzept-buendeln.md): ein Umschalter für die ganze App, 7 T · 30 T · 3 M · 6 M · 1 J.
// „Heute“ ist eine zuschaltbare Taste davor (Verlauf zeigt dort die Werte von heute im Bereich).

export type Zeitraum = "heute" | "7T" | "30T" | "3M" | "6M" | "1J";

export type ZeitraumInfo = {
  key: Zeitraum;
  label: string; // Taste
  name: string; // vorgelesen
  days: number;
  weekly: boolean; // ab 6 Monaten Wochenmittel
  last: string; // „letzte 30 Tage“
  inText: string; // „in den letzten 30 Tagen“
};

export const ZEITRAEUME: ZeitraumInfo[] = [
  { key: "heute", label: "Heute", name: "Heute", days: 1, weekly: false, last: "heute", inText: "heute" },
  { key: "7T", label: "7 T", name: "7 Tage", days: 7, weekly: false, last: "letzte 7 Tage", inText: "in den letzten 7 Tagen" },
  { key: "30T", label: "30 T", name: "30 Tage", days: 30, weekly: false, last: "letzte 30 Tage", inText: "in den letzten 30 Tagen" },
  { key: "3M", label: "3 M", name: "3 Monate", days: 91, weekly: false, last: "letzte 3 Monate", inText: "in den letzten 3 Monaten" },
  { key: "6M", label: "6 M", name: "6 Monate", days: 182, weekly: true, last: "letzte 6 Monate", inText: "in den letzten 6 Monaten" },
  { key: "1J", label: "1 J", name: "1 Jahr", days: 365, weekly: true, last: "letztes Jahr", inText: "im letzten Jahr" },
];

/** Standard: alles ohne „Heute“ */
export const STANDARD: Zeitraum[] = ["7T", "30T", "3M", "6M", "1J"];

export const zeitraum = (k: Zeitraum) => ZEITRAEUME.find((z) => z.key === k)!;
