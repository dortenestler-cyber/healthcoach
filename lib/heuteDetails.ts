// Detailseiten hinter den Ringen auf Heute (ohne "use client", damit die Seite sie auf dem Server prüfen kann)
export const DETAILS = { readiness: "Readiness", schlaf: "Schlaf", belastung: "Belastung", stress: "Stress", energie: "Energie", intensitaet: "Intensität" } as const;
export type DetailKey = keyof typeof DETAILS;

// Namen aller Werte mit Verlauf (wie MetricKey in lib/garmin.ts), für die Wert-Seite /wert/<name> auf dem Server
export const METRIC_NAMES = ["schlaf", "hrv", "ruhepuls", "atem", "bb", "stress", "schritte", "tiefschlaf", "rem", "einschlafen", "bb_aufgeladen", "stress_hoch", "belastung", "alltagsschritte"] as const;
export type MetricName = (typeof METRIC_NAMES)[number];
