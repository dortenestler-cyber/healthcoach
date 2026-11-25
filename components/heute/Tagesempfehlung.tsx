"use client";

import type { ReactNode } from "react";
import { useBriefing } from "@/lib/briefing";
import { longDate } from "@/lib/dates";
import CoachText from "@/components/ui/CoachText";

// Tagesempfehlung vom Coach auf Heute (Logbuch 25.11., Variante A): Lage in einem Satz,
// dazu 2–3 konkrete Anpassungen für heute, jede mit dem Wert, auf dem sie beruht.
// Ohne Coach oder bei einem Fehler steht der Satz nach festen Regeln (ersatz).
const frage = (tag: string) =>
  `Tagesempfehlung für ${longDate(new Date(tag + "T12:00:00"))}. Schreib aus der Zusammenfassung meine Empfehlung für heute, damit ich meinen Tag danach planen kann.
Form, genau so:
- Erste Zeile: ein Satz zur Lage mit Zyklustag und Phase, Erholung und dem, was heute auffällt.
- Danach 2 bis 3 Zeilen, jede beginnt mit „- “: eine konkrete Anpassung für heute, zum Beispiel Training (Sportart, Härte, bei Verletzung der Ersatz), Belastungsziel, Pausen, Abend und Schlaf; an Karate-Tagen, was ich üben soll. Hinter jede Anpassung in Klammern den Wert, auf dem sie beruht.
Nur was zu meinen Daten von heute passt. Keine Einleitung, keine allgemeinen Ratschläge, keine Hinweise auf die App.`;

export default function Tagesempfehlung({ tag, ersatz }: { tag: string; ersatz: ReactNode }) {
  const { text, laedt, fehler, coachAn, neu } = useBriefing("tag", tag, frage(tag));
  if (!coachAn || (fehler && !text)) return <>{ersatz}</>;
  return (
    <section className="explain coach-brief" data-tone="recovery" aria-label="Für heute" aria-busy={laedt}>
      <div className="coach-brief-kopf">
        <span className="eyebrow">Für heute</span>
        <button type="button" className="icon-btn" aria-label="Empfehlung neu schreiben" disabled={laedt} onClick={neu}>↻</button>
      </div>
      {text ? <CoachText text={text} /> : <p className="meta">{laedt ? "Coach schreibt …" : ""}</p>}
      {fehler && text && <p className="meta">Neu schreiben ging nicht: {fehler}</p>}
    </section>
  );
}
