import { GOAL_GRADE, GRADES, planWeek, type Climb, type KbPlan, type KbSet } from "@/lib/training";

// Zielkarten für Bouldern und Kettlebell (Konzept docs/konzept-einfach.md, Paket 9, Rahmen C).
// Nur aus vorhandenen Daten, keine neuen Zielregeln.
export type ZielStand = { ziel: string; zeit: string; zeitNote?: string; sitzt: number; total: number; wort: string; satz: string; kurz: string; kurzNote: string };

// Kettlebell: Einheiten des Plans gegen geplante Einheiten, im Plan = mindestens so viele wie bis zur laufenden Woche vorgesehen
export function kbZiel(plan: KbPlan, sets: KbSet[]): ZielStand {
  const week = planWeek(plan);
  const tage = new Set(sets.filter((s) => s.plan_id === plan.id).map((s) => s.day)).size;
  const total = plan.weeks * plan.per_week;
  const soll = Math.min(total, (week - 1) * plan.per_week);
  const rest = plan.weeks - week;
  const satz = tage >= total ? "Plan geschafft. Zeit für den nächsten." : tage >= soll ? "Du liegst im Plan." : `${soll - tage} ${soll - tage === 1 ? "Einheit" : "Einheiten"} hinter dem Plan.`;
  return {
    ziel: `Plan „${plan.name}“`,
    zeit: `Woche ${week} von ${plan.weeks}`,
    zeitNote: rest > 0 ? `noch ${rest} ${rest === 1 ? "Woche" : "Wochen"} · ${plan.per_week} pro Woche` : `letzte Woche · ${plan.per_week} pro Woche`,
    sitzt: tage,
    total,
    wort: "Einheiten",
    satz,
    kurz: `Woche ${week}/${plan.weeks}`,
    kurzNote: `${tage} von ${total} Einheiten`,
  };
}

// Bouldern: Tops ab dem Zielgrad gegen alle Versuche ab dem Zielgrad (letzte 8 Wochen)
export function boulderZiel(climbs: Climb[]): ZielStand {
  const ab = GRADES.slice(GRADES.indexOf(GOAL_GRADE));
  const imZiel = climbs.filter((c) => ab.includes(c.grade));
  const tops = imZiel.filter((c) => c.result !== "versuch").length;
  const below = GRADES[GRADES.indexOf(GOAL_GRADE) - 1];
  return {
    ziel: `Ziel ${GOAL_GRADE} · Bouldern`,
    zeit: tops ? `${tops} ${tops === 1 ? "Top" : "Tops"} ab ${GOAL_GRADE}` : `Noch kein ${GOAL_GRADE}`,
    zeitNote: "letzte 8 Wochen",
    sitzt: tops,
    total: imZiel.length,
    wort: "Tops",
    satz: tops
      ? `${tops} von ${imZiel.length} Versuchen ab ${GOAL_GRADE} geschafft.`
      : imZiel.length
        ? `${imZiel.length} ${imZiel.length === 1 ? "Versuch" : "Versuche"} ab ${GOAL_GRADE}, noch ohne Top. Viele saubere Tops in ${below} helfen.`
        : `Ein guter Weg: viele saubere Tops in ${below}, dann gezielt ${GOAL_GRADE} probieren.`,
    kurz: `${tops}/${imZiel.length}`,
    kurzNote: `Tops ab ${GOAL_GRADE}`,
  };
}
