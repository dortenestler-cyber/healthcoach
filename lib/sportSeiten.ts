import type { Feature } from "@/lib/prefs";
import type { Sport } from "@/lib/training";

// Sportarten mit eigener Seite unter /training/<slug> (Konzept docs/konzept-einfach.md, Paket 4)
export const SPORT_SEITEN: { slug: "karate" | "kettlebell" | "bouldern"; sport: Sport; feature: Feature }[] = [
  { slug: "karate", sport: "karate", feature: "karate" },
  { slug: "kettlebell", sport: "kettlebell", feature: "kettlebell" },
  { slug: "bouldern", sport: "klettern", feature: "bouldern" },
];
