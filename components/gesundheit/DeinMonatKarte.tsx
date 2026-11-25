"use client";

import Link from "next/link";
import { useBriefing } from "@/lib/briefing";
import { Details } from "@/components/ui/Pille";
import CoachText from "@/components/ui/CoachText";
import type { MonatsZeile } from "@/lib/deinMonat";

// Dein Monat (Logbuch 25.11., Variante A): ein zusammenhängender Text vom Coach statt einer Liste.
// Die einzelnen Veränderungen stehen darunter hinter „Details“. Ohne Coach: Satz und Liste wie bisher.
const frage = (monat: string, vormonat: string) =>
  `Monatsrückblick ${monat}. Fasse in einem zusammenhängenden Absatz aus 4 bis 6 Sätzen zusammen, wie sich mein ${monat} gegenüber dem ${vormonat} verändert hat. Verbinde die Veränderungen miteinander, statt sie aufzuzählen: Was hängt vermutlich zusammen, was passt zu Zyklusphase, Krankheit, Verletzung oder Gewohnheiten, was ist ungewöhnlich? Schließe mit einer konkreten Empfehlung für die nächsten Tage, die ich in meine Planung übernehmen kann. Keine Liste, keine Einleitung, keine Hinweise auf die App.`;

export default function DeinMonatKarte({ today, monat, vormonat, zeilen }: { today: string; monat: string; vormonat: string; zeilen: MonatsZeile[] }) {
  const zusatz = zeilen.length ? `Veränderungen ${monat} gegenüber ${vormonat} (aus der App):\n${zeilen.map((z) => "- " + z.text).join("\n")}` : "";
  const { text, laedt, fehler, coachAn, neu } = useBriefing("monat", `${today}|${zeilen.length}`, zeilen.length ? frage(monat, vormonat) : null, zusatz);
  const n = zeilen.length;
  const satz = n === 0 ? `Im ${monat} ist alles etwa wie im ${vormonat}.` : n === 1 ? `Eine Sache hat sich gegenüber ${vormonat} verändert.` : `${n} Dinge haben sich gegenüber ${vormonat} verändert.`;
  const liste = zeilen.map((z) => (
    <Link key={z.key} href={z.href} className="card-row list-line unit-link">
      <span>{z.text}</span>
      <span className="row-chev" aria-hidden="true">›</span>
    </Link>
  ));
  const mitCoach = coachAn && n > 0 && !(fehler && !text);
  return (
    <section className="card" aria-busy={laedt}>
      <div className="coach-brief-kopf">
        <span className="eyebrow">Dein Monat · {monat}</span>
        {mitCoach && <button type="button" className="icon-btn" aria-label="Rückblick neu schreiben" disabled={laedt} onClick={neu}>↻</button>}
      </div>
      {mitCoach ? (
        <>
          {text ? <CoachText text={text} /> : <p className="meta">{laedt ? "Coach schreibt …" : ""}</p>}
          <Details id="monat.liste" label={`Alle ${n} Veränderungen`}>{liste}</Details>
        </>
      ) : (
        <>
          <h2>{satz}</h2>
          {liste}
        </>
      )}
    </section>
  );
}
