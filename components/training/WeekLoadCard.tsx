"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import type { Data } from "@/lib/insights";
import { sportOfGarmin, WEEKDAY_LABELS, type Session } from "@/lib/training";
import WeekLoadView from "@/components/training/WeekLoadView";

// Diese Woche: Last mit Zielkorridor aus 4 Wochen, Tagessäulen, Soll und Ist der geplanten Einheiten
export default function WeekLoadCard({ data }: { data: Data | null }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = isoDay();
  const d = new Date(today + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const from = isoDay(d);
  d.setDate(d.getDate() + 6);
  const to = isoDay(d);

  useEffect(() => {
    supabase()
      ?.from("planned_sessions")
      .select("*")
      .gte("day", from)
      .lte("day", to)
      .then(({ data: rows }) => setSessions((rows ?? []) as Session[]));
  }, [from, to]);

  if (!data) return null;
  const actsOn = (day: string) => data.acts.filter((a) => (a.start_local ?? "").slice(0, 10) === day);
  const planned = sessions.filter((s) => s.status !== "ausgelassen");
  const done = planned.filter((s) => s.status === "erledigt" || actsOn(s.day).some((a) => sportOfGarmin(a.type_key) === s.sport)).length;
  return <WeekLoadView today={today} data={data} planned={planned.length} done={done} labels={WEEKDAY_LABELS} />;
}
