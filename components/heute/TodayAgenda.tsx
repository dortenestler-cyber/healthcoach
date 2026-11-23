"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HealthToday from "@/components/HealthToday";
import TodayPlan from "@/components/TodayPlan";
import type { DayRule } from "@/lib/cycle";
import type { Data } from "@/lib/insights";
import { supabase } from "@/lib/supabase";

// „Heute steht an“: nur, was heute zu tun ist. Hinweise bei Krankheit oder Verletzung · geplantes Training · Medikamente · offener Check-in.
// Die Belastung steht jetzt als Ring oben, das Ziel im Satz zum Tag.
export default function TodayAgenda({ day, showPlan }: { day: string; data: Data | null; rule: DayRule | null; showPlan: boolean }) {
  const [checkinOpen, setCheckinOpen] = useState(false);

  useEffect(() => {
    supabase()
      ?.from("checkins")
      .select("day")
      .eq("day", day)
      .maybeSingle()
      .then(({ data: c, error }) => setCheckinOpen(!error && !c));
  }, [day]);

  return (
    <section aria-label="Heute steht an">
      <div className="sec-head">
        <h2 className="sec-title">Heute steht an</h2>
      </div>
      <div className="card agenda-card">
        <HealthToday>{showPlan ? <TodayPlan /> : null}</HealthToday>
        {checkinOpen && (
          <Link href="/tagebuch" className="agenda-part card-row">
            <span className="row-label">Morgen-Check-in noch offen</span>
            <span className="link-small">Im Tagebuch ›</span>
          </Link>
        )}
      </div>
    </section>
  );
}
