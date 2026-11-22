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

// Gewohnheiten (früher „Einflüsse“). Reihenfolge und eigene Gewohnheiten: lib/habits.ts
export const INFLUENCES: { key: string; label: string }[] = [
  { key: "sauna", label: "Sauna" },
  { key: "alkohol", label: "Alkohol" },
  { key: "koffein", label: "Koffein" },
  { key: "stress", label: "Stress" },
  { key: "sport", label: "Sport" },
  { key: "wenig_trinken", label: "Wenig getrunken" },
  { key: "schwitzen", label: "Viel geschwitzt" },
];

// Wadenzucken und Wadenkrämpfe: eine Sache mit Intensität
export const MUSCLE_LEVELS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Zucken" },
  { value: 2, label: "Krampf" },
  { value: 3, label: "starker Krampf" },
];
export const MUSCLE_SIDES = [
  { key: "links", label: "links" },
  { key: "rechts", label: "rechts" },
  { key: "beide", label: "beide" },
];
export const MUSCLE_SPOTS = [
  { key: "wade", label: "Wade" },
  { key: "fuss", label: "Fuß" },
  { key: "oberschenkel", label: "Oberschenkel" },
  { key: "andere", label: "andere Stelle" },
];
export const MUSCLE_SITUATIONS = [
  { key: "abends", label: "abends in Ruhe" },
  { key: "tagsueber", label: "tagsüber" },
  { key: "training", label: "beim Training" },
  { key: "nach_training", label: "nach dem Training" },
  { key: "nachts", label: "nachts" },
];
export const MUSCLE_DURATIONS = [
  { key: "sekunden", label: "Sekunden" },
  { key: "minute", label: "bis 1 Minute" },
  { key: "laenger", label: "länger" },
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
