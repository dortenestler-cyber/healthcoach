// Zusammenhänge (Konzept docs/konzept-buendeln.md, Baustein 4): ein Aufbau für alles, was der Muster-Motor findet.
// Immer: Kopf (häufiger/seltener, trifft heute zu), Satz mit Belegzahl, wie sicher (vorläufig/deutlich),
// darunter die Grundlage und „Ein Zusammenhang, kein Beweis“. Nie eine Ursache, nie eine Diagnose.

import type { Analysis, Finding } from "@/lib/muster";
import { MIN_EVENT_DAYS } from "@/lib/muster";

export function Zusammenhang({ titel, satz, sicherheit, heute }: { titel?: string; satz: string; sicherheit?: Finding["sicherheit"]; heute?: boolean }) {
  return (
    <div className="zh">
      {(titel || sicherheit) && (
        <span className="zh-head">
          {titel && <span className="row-strong">{titel}{heute ? " · trifft heute zu" : ""}</span>}
          {sicherheit && <span className={`badge zh-${sicherheit === "deutlich" ? "deutlich" : "vorlaeufig"}`}>{sicherheit}</span>}
        </span>
      )}
      <span className="zh-satz">{satz}</span>
    </div>
  );
}

// Liste aus einer Auswertung. mit: „mit Anzeichen“, wofür die Tage stehen. max: höchstens so viele.
export function ZusammenhangListe({ a, mit, start, max = 3, leer }: { a: Analysis; mit: string; start: string; max?: number; leer: string }) {
  if (!a.ready) return <span className="meta">{`Muster erscheinen ab ${MIN_EVENT_DAYS} Tagen ${mit}, bisher ${a.eventDays}. ${start}`.trim()}</span>;
  const shown = a.findings.slice(0, max);
  return (
    <div className="zh-liste">
      {shown.length ? (
        shown.map((f) => <Zusammenhang key={f.key} titel={`${f.more ? "Häufiger" : "Seltener"}: ${f.label}`} satz={f.text} sicherheit={f.sicherheit} heute={f.today} />)
      ) : (
        <span className="meta">{leer}</span>
      )}
      <span className="meta">
        Grundlage: {a.eventDays} {a.eventDays === 1 ? "Tag" : "Tage"} {mit} in {a.windowDays} Tagen, {a.checked} Vergleiche. Gezeigt wird nur, was mindestens doppelt oder halb so oft vorkommt. Ein Zusammenhang, kein Beweis.
      </span>
    </div>
  );
}
