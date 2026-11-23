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
  // Übliche Zyklus-Symptome (Sammelliste Punkt 12)
  { key: "kraempfe", label: "Unterleibskrämpfe" },
  { key: "brust", label: "Brustspannen" },
  { key: "blaeh", label: "Blähbauch, Wassereinlagerungen" },
  { key: "heisshunger", label: "Heißhunger" },
  { key: "ruecken", label: "Rückenschmerzen" },
  { key: "haut", label: "Hautunreinheiten" },
  { key: "uebel", label: "Übelkeit" },
  { key: "unruhe", label: "Ängstlichkeit, innere Unruhe" },
  { key: "schwindel", label: "Schwindel" },
  { key: "libido", label: "Libido verändert" },
  { key: "schmier", label: "Schmierblutung" },
];

// Leichte Anzeichen, ohne gleich krank zu sein (Sammelliste Punkt 19). Gespeichert wie Symptome, eigene Schlüssel.
// phrase: Form mitten im Satz, z. B. „Rauer Hals und verstopfte Nase“
export const SIGNS: { key: string; label: string; phrase: string }[] = [
  { key: "hals_rau", label: "Rauer Hals", phrase: "rauer Hals" },
  { key: "halsweh", label: "Halsschmerzen", phrase: "Halsschmerzen" },
  { key: "nase_zu", label: "Verstopfte Nase", phrase: "verstopfte Nase" },
  { key: "schnupfen", label: "Schnupfen", phrase: "Schnupfen" },
  { key: "niesen", label: "Niesen", phrase: "Niesen" },
  { key: "husten", label: "Husten", phrase: "Husten" },
  { key: "froesteln", label: "Frösteln", phrase: "Frösteln" },
  { key: "glieder", label: "Gliederschmerzen", phrase: "Gliederschmerzen" },
  { key: "abgeschlagen", label: "Abgeschlagen", phrase: "Abgeschlagenheit" },
  { key: "nebenhoehlen", label: "Druck im Kopf, Nebenhöhlen", phrase: "Druck in den Nebenhöhlen" },
  { key: "lippen", label: "Lippenbläschen", phrase: "Lippenbläschen" },
];
export const SIGN_KEYS = new Set(SIGNS.map((s) => s.key));

// Symptome und Anzeichen zusammen, z. B. für Auswertungen und den Coach
export const ALL_SYMPTOMS = [...SYMPTOMS, ...SIGNS];
export const symptomLabel = (key: string) => ALL_SYMPTOMS.find((s) => s.key === key)?.label ?? key;

// Wie viele Knöpfe im Tagebuch ohne „Weitere anzeigen“ sichtbar sind (mindestens)
export const VISIBLE_MIN = 6;

// Oben: heute eingetragen oder in den letzten Wochen genutzt, aufgefüllt in Listenreihenfolge bis VISIBLE_MIN. Rest unter „Weitere“.
export function splitFrequent<T extends { key: string }>(items: T[], used: Set<string>): { top: T[]; rest: T[] } {
  const top = items.filter((i) => used.has(i.key));
  for (const i of items) {
    if (top.length >= VISIBLE_MIN) break;
    if (!top.includes(i)) top.push(i);
  }
  const order = new Map(items.map((i, n) => [i.key, n]));
  top.sort((a, b) => order.get(a.key)! - order.get(b.key)!);
  return { top, rest: items.filter((i) => !top.includes(i)) };
}

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
