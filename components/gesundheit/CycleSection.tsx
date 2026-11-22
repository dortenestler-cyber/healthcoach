"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import type { Diary } from "@/lib/insights";
import CycleView from "@/components/gesundheit/CycleView";

// Lädt zwei Jahre Tagebuch (für den Bereich von vor einem Jahr) und 12 Wochen Hitzewallungen
export default function CycleSection({ showFlashes }: { showFlashes: boolean }) {
  const [diary, setDiary] = useState<Diary[] | null>(null);
  const [flashes, setFlashes] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    Promise.all([
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(760))).order("day"),
      sb.from("hot_flashes").select("at").gte("at", daysAgo(90).toISOString()),
    ]).then(([d, f]) => {
      if (d.error) setError("Tagebuch konnte nicht geladen werden: " + d.error.message);
      setDiary(((d.data ?? []) as Diary[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] })));
      setFlashes(((f.data ?? []) as { at: string }[]).map((r) => r.at));
    });
  }, []);

  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!diary) return <p className="hint">Lädt …</p>;
  return <CycleView today={isoDay()} diary={diary} flashes={flashes} showFlashes={showFlashes} />;
}
