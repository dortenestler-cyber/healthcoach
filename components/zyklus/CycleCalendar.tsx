"use client";

// Zyklus-Kalender: der gemeinsame Monatskalender (Konzept Bündeln, Baustein 2) mit Zyklus und Symptomen an,
// Training zuschaltbar. Oben die Vorhersage der nächsten Periode, unten „Periode eintragen +“ (Vorlage 02).
// Tippen auf einen Tag öffnet das Tagesblatt (Baustein 1).

import Link from "next/link";
import { useState } from "react";
import { nextPeriodText } from "@/lib/cycle";
import type { Data, Diary } from "@/lib/insights";
import EditSheet from "@/components/ui/EditSheet";
import Tagesblatt from "@/components/tag/Tagesblatt";
import Monatskalender, { type Punkt } from "@/components/kalender/Monatskalender";
import { longDate } from "@/lib/dates";
import { sportOf, type Sport } from "@/lib/training";

export default function CycleCalendar({ today, diary, data }: { today: string; diary: Diary[]; data?: Data | null }) {
  const [picked, setPicked] = useState<string | null>(null);
  const forecast = nextPeriodText(today, diary);

  // Training aus den schon geladenen Daten: Garmin-Einheiten und im Kalender erfasste Einheiten
  const punkte = (day: string): Punkt[] => {
    const acts = (data?.acts ?? []).filter((a) => (a.start_local ?? "").slice(0, 10) === day);
    const out: Punkt[] = acts.map((a) => ({ key: String(a.activity_id), sport: sportOf(a), filled: true }));
    for (const s of data?.done ?? []) if (s.day === day && !out.some((x) => x.sport === s.sport)) out.push({ key: "d" + s.day + s.sport, sport: s.sport as Sport, filled: true });
    return out;
  };

  return (
    <>
      <Monatskalender
        today={today}
        diary={diary}
        ebenen={["zyklus", "symptome", "training"]}
        merken="zyklus"
        start={["zyklus", "symptome"]}
        punkte={data ? punkte : undefined}
        onPick={setPicked}
        maxForward={3}
        head={forecast && <p className="cal-forecast">{forecast}</p>}
        footer={
          <Link href="/tagebuch" className="add-row">
            <span className="cyc4-text-menstruation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg></span>
            <span className="add-row-label">Periode eintragen</span>
            <span className="add-row-plus" aria-hidden="true">+</span>
          </Link>
        }
      />
      <EditSheet title={picked ? (picked === today ? "Heute" : longDate(new Date(picked + "T12:00:00"))) : "Tag"} open={!!picked} instant onClose={() => setPicked(null)}>
        {picked && <Tagesblatt key={picked} day={picked} data={data ?? null} bare />}
      </EditSheet>
    </>
  );
}
