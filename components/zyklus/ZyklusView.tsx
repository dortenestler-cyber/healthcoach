"use client";

import { useState } from "react";
import Link from "next/link";
import { DivergingBars } from "@/components/charts";
import CycleRing, { groupLabel } from "@/components/zyklus/CycleRing";
import CycleDayChart from "@/components/zyklus/CycleDayChart";
import CycleHistory from "@/components/zyklus/CycleHistory";
import { cycleToday, groupOf, PHASES, type PhaseGroup } from "@/lib/cycle";
import { METRICS, type MetricKey } from "@/lib/garmin";
import { patterns, type Data, type Diary } from "@/lib/insights";
import { symptomHeat } from "@/lib/zyklusAuswertung";
import { MIN_EVENT_DAYS, muscleAnalysis, muscleByPhase, type MusterExtra } from "@/lib/muster";
import { byCycleDay, CYCLE_METRICS, effectsByPhase, MIN_DAYS, phaseProfile, ringArcs } from "@/lib/zyklusSeite";

const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const date = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const tone = (k: MetricKey) => (k === "schlaf" ? "sleep" : k === "temperatur" ? "cycle" : k === "bb" ? "training" : "recovery");
const ms = (v: number) => `${Math.round(v)} ms`;

type Props = { today: string; data: Data; longDiary: Diary[]; flashes: string[]; showFlashes: boolean; extra?: MusterExtra | null };

// Seite Zyklus: dein Zyklus im Mittelpunkt, Muster innerhalb des Zyklus. Ohne Netzwerk, die Daten kommen von ZyklusPage.
export default function ZyklusView({ today, data, longDiary, flashes, showFlashes, extra }: Props) {
  const [metric, setMetric] = useState<MetricKey>("hrv");
  const ct = cycleToday(today, longDiary);
  const phase = ct.phase ? PHASES[ct.phase] : null;
  const group = groupOf(ct.phase);
  const profile = ct.phase ? phaseProfile(today, { ...data, diary: longDiary }, ct.phase) : [];
  const muscle = new Map<string, number>();
  for (const m of extra?.muscle ?? []) muscle.set(m.day, Math.max(muscle.get(m.day) ?? 0, m.intensity));
  const heat = symptomHeat(longDiary, muscle);
  const col = ct.cycleDay !== null ? ct.cycleDay - 1 : null;
  const near = col === null ? [] : heat.rows
    .map((r) => ({ label: r.label, v: Math.max(...[col - 1, col, col + 1].map((i) => r.values[i] ?? 0)) }))
    .filter((r) => r.v >= 0.5)
    .sort((a, b) => b.v - a.v);
  const m = METRICS[metric];
  const bcd = byCycleDay(metric, today, { ...data, diary: longDiary });
  const effects = effectsByPhase({ ...data, diary: longDiary });
  const effectRows = effects.flatMap((e) => [
    { label: `${e.label}`, value: e.follikel, note: e.follikel === null ? `Follikel · ${e.nF} von ${MIN_DAYS} Nächten` : `Follikel · ${e.nF} Nächte` },
    { label: `${e.label}`, value: e.luteal, note: e.luteal === null ? `Luteal · ${e.nL} von ${MIN_DAYS} Nächten` : `Luteal · ${e.nL} Nächte` },
  ]).filter((r) => r.value !== null);
  const waiting = effects.filter((e) => e.follikel === null && e.luteal === null).map((e) => e.label);
  const lutStrongest = [...effects].filter((e) => e.luteal !== null).sort((a, b) => Math.abs(b.luteal as number) - Math.abs(a.luteal as number))[0];
  const more = patterns({ ...data }).filter((p) => p.key !== "zyklus");

  // Wadenzucken und -krämpfe je Phase; Muster ohne Zyklusbezug stehen unten unter „Weitere Muster“
  const full = { ...data, diary: longDiary };
  const phaseRows = extra ? muscleByPhase(full, extra, today).filter((r) => r.days > 0) : [];
  const muscleTotal = muscle.size;
  const ma = extra && muscleTotal ? muscleAnalysis(full, extra, today) : null;
  const otherMuscle = ma?.findings.find((f) => f.group !== "zyklus") ?? null;
  const pct = (r: { days: number; events: number }) => Math.round((r.events / r.days) * 100);
  const peakPhase = [...phaseRows].sort((a, b) => b.events / b.days - a.events / a.days)[0];
  const muscleSentence = !ma?.ready
    ? `Wadenkrämpfe je Phase erscheinen ab ${MIN_EVENT_DAYS} Tagen mit Zucken oder Krampf (bisher ${ma?.eventDays ?? 0}).`
    : (() => {
        const z = ma.findings.find((f) => f.group === "zyklus" && f.more);
        if (z) return z.text;
        return "Zucken und Krämpfe verteilen sich bisher ohne deutlichen Unterschied über den Zyklus.";
      })();

  let effectSentence = `Unterschiede je Phase erscheinen ab je ${MIN_DAYS} Nächten mit und ohne einen Einfluss in dieser Phase.`;
  if (lutStrongest && Math.abs(lutStrongest.luteal as number) >= 2) {
    const f = lutStrongest.follikel;
    effectSentence = `„${lutStrongest.label}“ wirkt in deiner Lutealphase am stärksten: HRV in der Nacht danach ${lutStrongest.luteal! > 0 ? "+" : "−"}${ms(Math.abs(lutStrongest.luteal!))}${f !== null ? `, in der Follikelphase ${f > 0 ? "+" : "−"}${ms(Math.abs(f))}` : ""}.`;
  } else if (effectRows.length) effectSentence = "Bisher zeigt keiner der Einflüsse je Phase einen deutlichen Unterschied bei der HRV.";

  const curSentence = !bcd.cycles
    ? `Der Vergleich mit früheren Zyklen erscheint ab 2 Zyklen mit ${m.label}-Werten.`
    : (() => {
        const i = [...bcd.current.keys()].reverse().find((k) => bcd.current[k] !== null && bcd.usual[k] !== null);
        if (i === undefined) return `${m.label} im laufenden Zyklus: noch keine Werte zum Vergleichen.`;
        // Schnitt der Abweichung an den letzten bis zu 3 Tagen mit beiden Werten
        const diffs: number[] = [];
        for (let j = Math.max(0, i - 2); j <= i; j++) {
          const c = bcd.current[j];
          const u = bcd.usual[j];
          if (c !== null && u !== null) diffs.push(c - u);
        }
        const avg = diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length);
        const smallStep = metric === "temperatur" ? 0.1 : metric === "schlaf" ? 0.25 : 2;
        return Math.abs(avg) < smallStep ? `${m.label} verläuft in diesem Zyklus wie in deinen früheren Zyklen.` : `${m.label} liegt in diesem Zyklus zuletzt ${avg > 0 ? "über" : "unter"} dem Schnitt deiner früheren Zyklen.`;
      })();

  return (
    <>
      <section className="card">
        <div className="cycle-head">
          <CycleRing cycleDay={ct.cycleDay} length={ct.length} phaseLabel={phase ? phase.label : "Phase unbekannt"} size={140} />
          <div className="stack">
            <span className="meta">Dein Zyklus heute</span>
            <span className="target-label">{phase ? phase.label : "Phase noch unbekannt"}</span>
            <span className="meta">{phase ? "geschätzt" : "Trag deine Periode im Tagebuch ein, dann schätzt die App die Phase."}</span>
            {ct.window && <span className="meta">Nächste Periode etwa {date(ct.window.earliest)} bis {date(ct.window.latest)}</span>}
            {!ct.window && ct.cycleDay !== null && <span className="meta">Periodenfenster ab 2 Zyklen</span>}
            {(!phase || !ct.window) && <Link href="/tagebuch#perioden" className="settings-link">Perioden nachtragen ›</Link>}
          </div>
        </div>
        <div className="legend">
          {ringArcs(ct.length).filter((a, i, all) => all.findIndex((b) => b.group === a.group) === i).map((a) => (
            <span key={a.group}><i className={`cycle-key-${a.group}`} />{groupLabel(a.group as PhaseGroup)}</span>
          ))}
          <span>Punkt = heute</span>
        </div>
        {phase && (
          <div className="suggest suggest-cycle">
            <span className="row-strong">{phase.pattern}</span>
            <span>Vorschlag: {phase.suggestion}. Anstrengung (1–10): {phase.rpe}. {phase.hint}</span>
          </div>
        )}
        <span className="meta">Phasen sind aus deinem Tagebuch geschätzt. Vorschlag, keine Diagnose.</span>
      </section>

      {phase && (
        <section className="card">
          <span className="meta">Heute in deinem Zyklus · {phase.label}</span>
          <h2>
            {near.length
              ? `Um diesen Zyklustag trägst du oft ${near.slice(0, 2).map((n) => `„${n.label}“`).join(" und ")} ein.`
              : profile.some((p) => p.phase !== null)
                ? `So sehen deine Werte in ${phase.inPhase} aus.`
                : `Für ${phase.inPhase} fehlen noch Tage mit Messwerten.`}
          </h2>
          <div className="factor-list">
            {profile.map((p) => (
              <div key={p.key} className="card-row list-line">
                <div className="stack">
                  <span className="row-strong">{p.label}</span>
                  <span className="meta">{p.phase === null ? `${p.n} von ${MIN_DAYS} Tagen in dieser Phase` : `Schnitt aller Tage ${p.all !== null ? p.fmt(p.all) : "–"}`}</span>
                </div>
                <span className="range-row-value">{p.phase === null ? "–" : p.fmt(p.phase)}</span>
              </div>
            ))}
          </div>
          {near.length > 0 && <span className="meta">Symptome: in mindestens der Hälfte deiner letzten {heat.n} Zyklen um diesen Zyklustag eingetragen.</span>}
          <span className="meta">Schnitt in dieser Phase aus den letzten 6 Monaten. Ein Muster, keine Diagnose.</span>
        </section>
      )}

      <section className="card">
        <span className="meta">{m.label} nach Zyklustag · dieser Zyklus und frühere</span>
        <h2>{curSentence}</h2>
        <div className="pills scroll">
          {CYCLE_METRICS.map((k) => (
            <button key={k} type="button" className="pill" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {METRICS[k].label}
            </button>
          ))}
        </div>
        {ct.cycleDay !== null ? (
          <CycleDayChart d={bcd} fmt={m.fmt} tone={tone(metric)} zeroLine={metric === "temperatur"} label={`${m.label} nach Zyklustag: dieser Zyklus gegen den Schnitt von ${bcd.cycles} früheren Zyklen`} />
        ) : (
          <p>Die Ansicht nach Zyklustag erscheint, sobald eine Periode im Tagebuch steht.</p>
        )}
        <div className={`legend cb-${tone(metric)}`}>
          <span><i className="cb-key-line" />Dieser Zyklus</span>
          <span><i className="cb-key-usual" />Schnitt aus {bcd.cycles} früheren Zyklen</span>
          <span><i className="ph-menses-bg" />Menstruation</span>
          <span><i className="ph-follikel-bg" />Follikel</span>
          <span><i className="ph-luteal-bg" />Luteal</span>
        </div>
        <Link href={`/verlauf?m=${metric}`} className="settings-link">{m.label} im Verlauf ›</Link>
      </section>

      <CycleHistory today={today} diary={longDiary} flashes={flashes} showFlashes={showFlashes} muscle={extra ? muscle : undefined} />

      {extra && muscleTotal > 0 && (
        <section className="card">
          <span className="meta">Wadenzucken und Krämpfe · je Phase</span>
          <h2>{muscleSentence}</h2>
          {phaseRows.map((r) => (
            <div key={r.group} className="card-row list-line">
              <div className="stack">
                <span className="row-strong">{r.label}</span>
                <span className="meta">an {r.events} von {r.days} Tagen</span>
              </div>
              <span className="range-row-value">{pct(r)} %{ma?.ready && r === peakPhase && r.events > 0 ? " · am häufigsten" : ""}</span>
            </div>
          ))}
          <span className="meta">Tage seit deinem ersten Eintrag, Phasen aus dem Tagebuch geschätzt. Ein Zusammenhang, kein Beweis.</span>
          <Link href="/gesundheit?t=waden" className="settings-link">Alle Muster zu den Waden ›</Link>
        </section>
      )}

      <section className="card">
        <span className="meta">Was dir guttut · je Phase</span>
        <h2>{effectSentence}</h2>
        {effectRows.length > 0 && (
          <DivergingBars fmt={ms} label={`HRV in der Nacht danach je Phase: ${effectRows.map((r) => `${r.label} ${r.note} ${r.value! > 0 ? "plus" : "minus"} ${ms(Math.abs(r.value!))}`).join(", ")}`} rows={effectRows} />
        )}
        {waiting.length > 0 && <span className="meta">Noch zu wenige Nächte: {waiting.join(", ")}.</span>}
        <span className="meta">HRV in der Nacht danach, Tage mit Einfluss gegen Tage ohne, jeweils in derselben Phase. Ein Zusammenhang, keine Empfehlung.</span>
      </section>

      {(more.length > 0 || otherMuscle) && (
        <section className="card">
          <span className="meta">Weitere Muster</span>
          {more.map((p) => (
            <div key={p.key} className="stack list-line">
              <span className="row-strong">{p.title}</span>
              <span className={p.ready ? "" : "meta"}>{p.ready ? p.text : p.need}</span>
              {p.ready && <span className="meta">Grundlage: {p.basis}. Ein Zusammenhang, kein Beweis.</span>}
            </div>
          ))}
          {otherMuscle && (
            <div className="stack list-line">
              <span className="row-strong">Wadenkrämpfe</span>
              <span>{otherMuscle.text}</span>
              <Link href="/gesundheit?t=waden" className="settings-link">Mehr unter Gesundheit ›</Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}
