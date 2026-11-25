"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { boulderZiel, kbZiel } from "@/lib/ziele";
import type { Climb, KbPlan, KbSet } from "@/lib/training";

// Kachel auf Training › Übersicht: Zielkarte im Kleinen für Bouldern und Kettlebell (Paket 9, Rahmen C).
// Ohne Plan oder Einträge bleibt der Ersatz (Trainingstage in 4 Wochen).
export default function ZielStandKurz({ sport, ersatz }: { sport: "klettern" | "kettlebell"; ersatz: string }) {
  const [text, setText] = useState<{ wert: string; note: string } | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(7 * 8));
    if (sport === "klettern") {
      sb.from("climbs").select("id, day, grade, result").gte("day", from).then(({ data, error }) => {
        if (error || !data?.length) return;
        const z = boulderZiel(data as Climb[]);
        setText({ wert: z.kurz, note: z.kurzNote });
      });
    } else {
      sb.from("kb_plans").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).then(async ({ data, error }) => {
        const plan = (data ?? [])[0] as KbPlan | undefined;
        if (error || !plan) return;
        const { data: sets } = await sb.from("kb_sets").select("day, exercise, set_no, reps, weight_kg, target_reps, target_kg, plan_id").eq("plan_id", plan.id);
        const z = kbZiel(plan, (sets ?? []) as KbSet[]);
        setText({ wert: z.kurz, note: z.kurzNote });
      });
    }
  }, [sport]);
  return (
    <>
      <span className="sport-kachel-wert">{text?.wert ?? ersatz}</span>
      <span className="meta">{text?.note ?? "in 4 Wochen"}</span>
    </>
  );
}
