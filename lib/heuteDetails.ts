// Detailseiten hinter den Ringen auf Heute (ohne "use client", damit die Seite sie auf dem Server prüfen kann)
export const DETAILS = { readiness: "Readiness", schlaf: "Schlaf", belastung: "Belastung", stress: "Stress", energie: "Energie", intensitaet: "Intensität" } as const;
export type DetailKey = keyof typeof DETAILS;
