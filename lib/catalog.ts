// Feste Listen für Tagebuch und Check-in.

export const SYMPTOMS: { key: string; label: string }[] = [
  { key: "hitze", label: "Hitzewallungen" },
  { key: "nacht", label: "Nachtschweiß" },
  { key: "schlaf", label: "Schlafprobleme" },
  { key: "kopf", label: "Kopfschmerzen" },
  { key: "gelenk", label: "Gelenke" },
  { key: "herz", label: "Herzklopfen" },
  { key: "stimmung", label: "Stimmungstief" },
  { key: "reiz", label: "Reizbarkeit" },
  { key: "fog", label: "Brain Fog" },
  { key: "erschoepf", label: "Erschöpfung" },
];

export const LEVELS = ["", "leicht", "mittel", "stark"];

export const INFLUENCES: { key: string; label: string }[] = [
  { key: "alkohol", label: "Alkohol" },
  { key: "koffein", label: "Koffein" },
  { key: "stress", label: "Stress" },
  { key: "sport", label: "Sport" },
];

export const BLEEDING = ["keine", "Schmier", "leicht", "mittel", "stark"];

export const CHECKIN_QUESTIONS: { key: "energy" | "sleep" | "mood"; label: string }[] = [
  { key: "energy", label: "Energie" },
  { key: "sleep", label: "Schlafgefühl" },
  { key: "mood", label: "Stimmung" },
];

export const CHECKIN_LEVELS = ["niedrig", "mittel", "gut"];

// Zeilen im 4-Wochen-Raster
export const GRID_ROWS: { key: string; label: string }[] = [
  { key: "blut", label: "Blutung" },
  { key: "hitze", label: "Hitzewallungen" },
  { key: "nacht", label: "Nachtschweiß" },
  { key: "schlaf", label: "Schlafprobleme" },
  { key: "reiz", label: "Reizbarkeit" },
  { key: "erschoepf", label: "Erschöpfung" },
];
