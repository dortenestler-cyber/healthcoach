"use client";

// Ein Kalender für die ganze App (Konzept docs/konzept-buendeln.md, Baustein 2 „Kalender mit Ebenen“).
// Monat mit Phasenbändern wie Vorlage 02, Ebenen zum Zuschalten: Zyklus, Training, Symptome.
// Jeder Bereich gibt seine Voreinstellung mit. Tippen auf einen Tag ruft onPick (in der Regel: Tagesblatt öffnen).

import { useState, type ReactNode } from "react";
import { Pille, PillenZeile, useAuswahl } from "@/components/ui/Pille";
import { projectedPhase } from "@/lib/cycle";
import type { Diary } from "@/lib/insights";
import { PHASE4, PHASE4_LABEL, phase4Of, type Phase4 } from "@/components/zyklus/CycleRing";
import { SPORTS, type Sport } from "@/lib/training";

export type Ebene = "zyklus" | "training" | "symptome" | ZeichenEbene;
// Ebenen mit einem Zeichen je Tag (zentraler Kalender, Konzept docs/konzept-einfach.md, Paket 3)
export type ZeichenEbene = "gewohnheiten" | "krank" | "medikamente" | "schlaf";
export const EBENEN: { key: Ebene; label: string; farbe: string }[] = [
  { key: "zyklus", label: "Zyklus", farbe: "var(--cycle)" },
  { key: "training", label: "Training", farbe: "var(--training)" },
  { key: "symptome", label: "Symptome", farbe: "var(--warn)" },
  { key: "gewohnheiten", label: "Gewohnheiten", farbe: "var(--recovery)" },
  { key: "krank", label: "Krank & verletzt", farbe: "var(--warn)" },
  { key: "medikamente", label: "Medikamente", farbe: "var(--mobility)" },
  { key: "schlaf", label: "Schlaf", farbe: "var(--sleep)" },
];
// Form und Wort je Zeichen-Ebene: Farbe steht nie allein (Legende und Vorlesetext)
const ZEICHEN: Record<ZeichenEbene, { cls: string; legende: string }> = {
  gewohnheiten: { cls: "mk-hab", legende: "Gewohnheit" },
  krank: { cls: "mk-krank", legende: "krank oder verletzt" },
  medikamente: { cls: "mk-med", legende: "Bedarfs-Medikament" },
  schlaf: { cls: "mk-schlaf", legende: "Schlaf unter deinem Bereich" },
};
export type Punkt = { key: string; sport: Sport; filled: boolean }; // Training: voll = erledigt, hohl = geplant

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const ADDABLE: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];

type Cell = { day: string; n: number; phase: Phase4 | null; future: boolean; today: boolean; symptom: boolean; ov: boolean } | null;

type Props = {
  today: string;
  diary: Diary[];
  ebenen?: Ebene[]; // welche Ebenen es hier gibt
  start?: Ebene[]; // welche zu Beginn an sind
  merken?: string; // Ort, unter dem die gewählten Ebenen gemerkt werden, z. B. "training"
  punkte?: (day: string) => Punkt[]; // Training je Tag
  zeichen?: Partial<Record<ZeichenEbene, (day: string) => string | null>>; // Text für den Tag oder null
  selected?: string | null;
  onPick?: (day: string) => void;
  onMonth?: (first: string, last: string) => void; // für Bereiche, die je Monat nachladen
  maxForward?: number; // Monate nach vorn
  head?: ReactNode; // z. B. Vorhersage der nächsten Periode
  footer?: ReactNode; // z. B. „Periode eintragen +“
};

export default function Monatskalender({ today, diary, ebenen = ["zyklus", "training", "symptome"], start, merken = "allgemein", punkte, zeichen, selected, onPick, onMonth, maxForward = 3, head, footer }: Props) {
  const [offset, setOffset] = useState(0);
  const [on, toggle] = useAuswahl<Ebene>(`kalender.${merken}`, start ?? ebenen);
  const base = new Date(today + "T12:00:00");
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1, 12);
  const y = first.getFullYear();
  const m = first.getMonth();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDay = new Map(diary.map((d) => [d.day, d]));
  const zyklus = on.has("zyklus");
  const training = on.has("training") && !!punkte;
  const symptome = on.has("symptome");

  const shift = (n: number) => {
    const next = offset + n;
    setOffset(next);
    const f = new Date(base.getFullYear(), base.getMonth() + next, 1, 12);
    onMonth?.(iso(f.getFullYear(), f.getMonth(), 1), iso(f.getFullYear(), f.getMonth(), new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate()));
  };

  const cells: Cell[] = Array(lead).fill(null);
  for (let n = 1; n <= daysIn; n++) {
    const day = iso(y, m, n);
    const e = byDay.get(day);
    const bleeding = (e?.bleeding ?? 0) > 0;
    cells.push({
      day,
      n,
      phase: !zyklus ? null : bleeding && day <= today ? "menstruation" : phase4Of(projectedPhase(day, today, diary).phase),
      future: day > today,
      today: day === today,
      symptom: Object.values(e?.symptoms ?? {}).some((v) => v > 0),
      ov: !!e?.ovulation?.length,
    });
  }
  while (cells.length % 7) cells.push(null);

  const segment = (i: number) => {
    const c = cells[i];
    if (!c || !c.phase) return "";
    const col = i % 7;
    const prev = col > 0 ? cells[i - 1] : null;
    const next = col < 6 ? cells[i + 1] : null;
    const same = (o: Cell) => !!o && o.phase === c.phase && o.future === c.future;
    return `${same(prev) ? "" : " cal-start"}${same(next) ? "" : " cal-end"}`;
  };
  const shown = cells.filter((c): c is NonNullable<Cell> => !!c);
  const anyPunkte = training && shown.some((c) => punkte!(c.day).length);
  // Vorgewählte Ebenen zuerst, damit sie in der Zeile zum Wischen sichtbar sind; die Reihenfolge bleibt beim Umschalten gleich
  const verfuegbar = EBENEN.filter((e) => ebenen.includes(e.key));
  const reihe = [...verfuegbar.filter((e) => (start ?? ebenen).includes(e.key)), ...verfuegbar.filter((e) => !(start ?? ebenen).includes(e.key))];
  const zEbenen = (Object.keys(ZEICHEN) as ZeichenEbene[]).filter((z) => on.has(z) && ebenen.includes(z) && zeichen?.[z]);
  const zeichenAm = (day: string) => zEbenen.map((z) => ({ z, text: zeichen![z]!(day) })).filter((x): x is { z: ZeichenEbene; text: string } => !!x.text);

  return (
    <section className="card mk">
      {head}
      <div className="cal-nav">
        <button type="button" className="icon-btn" aria-label="Voriger Monat" onClick={() => shift(-1)}>‹</button>
        <span className="eyebrow cal-title">{MONTHS[m]} {y}</span>
        <button type="button" className="icon-btn" aria-label="Nächster Monat" disabled={offset >= maxForward} onClick={() => shift(1)}>›</button>
      </div>
      {ebenen.length > 1 && (
        <PillenZeile label="Ebenen im Kalender" className="mk-ebenen" scroll={ebenen.length > 3}>
          {reihe.map((e) => (
            <Pille key={e.key} an={on.has(e.key)} farbe={e.farbe} onClick={() => toggle(e.key)}>
              {e.label}
            </Pille>
          ))}
        </PillenZeile>
      )}
      <div className="cal-grid cal-head" aria-hidden="true">
        {WD.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="cal-grid cal-days">
        {cells.map((c, i) => {
          if (!c) return <div key={"x" + i} className="cal-cell" aria-hidden="true" />;
          const p = training ? punkte!(c.day) : [];
          const zs = zeichenAm(c.day);
          const label = `${c.n}. ${MONTHS[m]}${c.phase ? ", " + PHASE4_LABEL[c.phase] : ""}${c.future && c.phase ? ", geschätzt" : ""}${c.today ? ", heute" : ""}${p.length ? ", " + p.map((x) => SPORTS[x.sport].label + (x.filled ? "" : " geplant")).join(", ") : ""}${symptome && c.symptom ? ", Symptome eingetragen" : ""}${zyklus && c.ov ? ", Eisprung-Zeichen eingetragen" : ""}${zs.map((x) => ", " + x.text).join("")}`;
          return (
            <button
              key={c.day}
              type="button"
              onClick={() => onPick?.(c.day)}
              aria-label={label}
              aria-pressed={selected ? selected === c.day : undefined}
              className={`cal-cell${c.phase ? ` cal-${c.phase}` : ""}${c.future ? " cal-future" : ""}${segment(i)}${selected === c.day ? " mk-sel" : ""}${!c.phase ? " mk-plain" : ""}`}
            >
              <span className="cal-band" aria-hidden="true" />
              <span className={`cal-num${c.today ? " cal-today" : ""}`} aria-hidden="true">{c.n}</span>
              {(p.length > 0 || (symptome && c.symptom) || zs.length > 0) && (
                <span className="mk-dots" aria-hidden="true">
                  {p.slice(0, 3).map((x) => <i key={x.key} style={{ borderColor: SPORTS[x.sport].color, background: x.filled ? SPORTS[x.sport].color : "transparent" }} />)}
                  {symptome && c.symptom && <i className="mk-sym" />}
                  {zs.map((x) => <i key={x.z} className={ZEICHEN[x.z].cls} />)}
                </span>
              )}
              {zyklus && c.ov && <span className="cal-ov" aria-hidden="true">✦</span>}
            </button>
          );
        })}
      </div>
      <div className="legend cal-legend">
        {zyklus && PHASE4.map((p) => <span key={p}><i className={`cal-key-${p}`} />{PHASE4_LABEL[p]}</span>)}
        {zyklus && <span><i className="cal-key-future" />geschätzt</span>}
        {anyPunkte && ADDABLE.map((s) => <span key={s}><i style={{ background: SPORTS[s].color }} />{SPORTS[s].label}</span>)}
        {anyPunkte && <span><i style={{ background: "transparent", border: "1.5px solid var(--muted)" }} />geplant</span>}
        {symptome && <span><i className="mk-key-sym" />Symptome</span>}
        {zEbenen.map((z) => <span key={z}><span className="mk-dots mk-key" aria-hidden="true"><i className={ZEICHEN[z].cls} /></span>{ZEICHEN[z].legende}</span>)}
        {zyklus && shown.some((c) => c.ov) && <span><span className="cal-ov-key" aria-hidden="true">✦</span>Eisprung-Zeichen</span>}
      </div>
      {footer}
    </section>
  );
}
