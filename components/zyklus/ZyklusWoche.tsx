"use client";

import Link from "next/link";
import { projectedPhase } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";
import { phase4Of, PHASE4_LABEL, type Phase4 } from "@/components/zyklus/CycleRing";

// Zyklus › Diese Woche (Konzept docs/konzept-einfach.md, Paket 5): sieben Tage mit Phasenfarbe und Wort.
// Ersetzt den Monatskalender auf der Seite; „Kalender ›“ öffnet den zentralen Kalender mit Zyklus und Symptomen.
const WT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const KURZ: Record<Phase4, string> = { menstruation: "Periode", follikel: "Follikel", eisprung: "Eisprung", luteal: "Luteal" };

export default function ZyklusWoche({ today, diary }: { today: string; diary: Diary[] }) {
  const t = new Date(today + "T12:00:00");
  const mo = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7), 12);
  const byDay = new Map(diary.map((d) => [d.day, d]));
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + i, 12);
    const day = iso(d);
    const bleeding = (byDay.get(day)?.bleeding ?? 0) > 0 && day <= today;
    const pp = projectedPhase(day, today, diary);
    const phase: Phase4 | null = bleeding ? "menstruation" : phase4Of(pp.phase);
    return { day, n: d.getDate(), phase, future: day > today };
  });
  // Phasenwechsel in dieser Woche als Satz, damit die Farbe nie allein steht
  const wechsel = tage.filter((x, i) => i > 0 && x.phase && x.phase !== tage[i - 1].phase);
  const satz = wechsel.length
    ? wechsel.map((x) => `${PHASE4_LABEL[x.phase!]} ab ${WT[tage.indexOf(x)]}`).join(", ") + (wechsel.some((x) => x.future) ? " (geschätzt)" : "")
    : tage[0].phase
      ? `Die ganze Woche ${PHASE4_LABEL[tage[0].phase]}${tage.some((x) => x.future) ? " (geschätzt)" : ""}`
      : "Phase noch unbekannt";

  return (
    <section className="card woche zyklus-woche">
      <div className="woche-kopf">
        <h2 style={{ textAlign: "left" }}>Diese Woche</h2>
        <Link href="/kalender?von=zyklus" className="sec-link woche-kal">Kalender ›</Link>
      </div>
      <div className="woche-tage">
        {tage.map((x, i) => (
          <div
            key={x.day}
            className={`woche-tag zw-tag${x.phase ? ` cal-${x.phase}` : ""}${x.future ? " zw-future" : ""}${x.day === today ? " is-heute" : ""}`}
            aria-label={`${WT[i]} ${x.n}.${x.phase ? ", " + PHASE4_LABEL[x.phase] : ""}${x.future ? ", geschätzt" : ""}${x.day === today ? ", heute" : ""}`}
            role="img"
          >
            <span className="woche-wt">{WT[i]}</span>
            <span className="woche-n">{x.n}</span>
            <span className="zw-wort">{x.phase ? KURZ[x.phase] : ""}</span>
          </div>
        ))}
      </div>
      <p className="meta">{satz}</p>
    </section>
  );
}
