// Einstiege in den zentralen Kalender (Konzept docs/konzept-einfach.md, Paket 3).
// Ohne „use client“, damit auch die Server-Seite /kalender den Einstieg prüfen kann.

export type Von = "heute" | "tagebuch" | "training" | "zyklus" | "gesundheit";

export const VON: Von[] = ["heute", "tagebuch", "training", "zyklus", "gesundheit"];

export const istVon = (v: string | undefined): v is Von => !!v && (VON as string[]).includes(v);
