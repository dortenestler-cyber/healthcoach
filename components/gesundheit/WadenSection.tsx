"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DayBars, ValueHeader } from "@/components/charts";
import { MUSCLE_SITUATIONS } from "@/lib/catalog";
import { isoDay } from "@/lib/dates";
import { loadInsightData, loadMusterExtra } from "@/lib/insightData";
import type { Data } from "@/lib/insights";
import { MAX_FINDINGS, MIN_EVENT_DAYS, muscleAnalysis, muscleWarnings, muscleWeeks, type MusterExtra } from "@/lib/muster";
import { ZusammenhangListe } from "@/components/ui/Zusammenhang";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const de1 = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });

// Gesundheit › Waden: Verlauf, wann es passiert, Muster mit Zyklus, Training, Erholung, Tagebuch und Einnahmen.
// Warnzeichen kommen aus festen Regeln. Zusammenhänge, keine Ursachen.
export default function WadenSection() {
  const [data, setData] = useState<Data | null>(null);
  const [extra, setExtra] = useState<MusterExtra | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([loadInsightData(), loadMusterExtra()])
      .then(([d, e]) => {
        setData(d);
        setExtra(e);
      })
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!data || !extra) return <p className="hint">Lädt …</p>;

  const today = isoDay();
  const warnings = muscleWarnings(extra.muscle, today);
  const weeks = muscleWeeks(extra.muscle, today);
  const now = weeks[weeks.length - 1];
  const prev = weeks.slice(0, -1);
  const started = prev.findIndex((w) => w.days > 0);
  const avg = started === -1 ? null : prev.slice(started).reduce((s, w) => s + w.days, 0) / (prev.length - started);
  const strong = weeks.reduce((s, w) => s + w.strong, 0);
  const weekSentence = !extra.muscle.length
    ? "Noch keine Einträge. Zucken und Krämpfe trägst du im Tagebuch ein."
    : avg === null
      ? `Diese Woche an ${now.days} ${now.days === 1 ? "Tag" : "Tagen"} Zucken oder Krampf.`
      : Math.abs(now.days - avg) < 1
        ? `Diese Woche etwa so oft wie im Schnitt der Wochen davor (${de1(avg)} Tage).`
        : `Diese Woche ${now.days > avg ? "öfter" : "seltener"} als im Schnitt der Wochen davor (${de1(avg)} Tage).`;

  const recent = extra.muscle.filter((m) => m.day >= weeks[0].monday);
  const bySit = MUSCLE_SITUATIONS.map((s) => ({ ...s, n: recent.filter((m) => m.situation === s.key).length })).filter((s) => s.n).sort((a, b) => b.n - a.n);
  const top = bySit[0];

  const a = muscleAnalysis(data, extra, today);
  const shown = a.findings.slice(0, MAX_FINDINGS);
  const zyklus = a.findings.filter((f) => f.group === "zyklus");

  return (
    <>
      {warnings.map((w) => (
        <p key={w.key} className="alert" role="alert">{w.text}</p>
      ))}

      <section className="card">
        <ValueHeader meta="Wadenzucken und Krämpfe · Tage pro Woche" sentence={weekSentence} value={String(now.days)}>
          <span className="value-range">Tage diese Woche{avg !== null ? ` · Schnitt davor ${de1(avg)}` : ""}{strong ? ` · ${strong} mit starkem Krampf in 12 Wochen` : ""}</span>
          {extra.muscle.length > 0 && (
            <DayBars
              tone="warn"
              fmt={(v) => String(Math.round(v))}
              label={`Tage mit Zucken oder Krampf in den letzten 12 Wochen: ${weeks.map((w) => `ab ${short(w.monday)} ${w.days}`).join(", ")}`}
              target={avg}
              targetLabel={avg !== null ? `Schnitt ${de1(avg)}` : undefined}
              bars={weeks.map((w, i) => ({ label: i % 3 === 0 || i === weeks.length - 1 ? short(w.monday) : "", value: w.days, tip: `Woche ab ${short(w.monday)}`, today: i === weeks.length - 1, marker: w.strong > 0 }))}
              markerLabel="Punkt = starker Krampf in dieser Woche"
            />
          )}
        </ValueHeader>
        <Link href="/tagebuch" className="settings-link">Im Tagebuch eintragen ›</Link>
      </section>

      {top && (
        <section className="card">
          <span className="meta">Wann es passiert · letzte 12 Wochen</span>
          <h2>Meist {top.label}: {top.n} von {recent.length} Einträgen.</h2>
          {bySit.map((s) => (
            <div key={s.key} className="card-row list-line">
              <span className="row-label">{s.label}</span>
              <span className="range-row-value">{s.n}</span>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <span className="meta">Muster · Zyklus, Training, Erholung, Tagebuch, Einnahmen</span>
        <h2>
          {!a.ready
            ? `Muster erscheinen ab ${MIN_EVENT_DAYS} Tagen mit Zucken oder Krampf (bisher ${a.eventDays}).`
            : shown.length
              ? `${shown.length === 1 ? "Ein deutlicher Zusammenhang" : `${shown.length} deutliche Zusammenhänge`} in ${a.windowDays} Tagen.`
              : "Bisher kein deutlicher Zusammenhang mit Zyklus, Training, Erholung oder Tagebuch."}
        </h2>
        {a.ready && <ZusammenhangListe a={{ ...a, findings: shown }} noun="Tagen mit Zucken oder Krampf" start="" max={shown.length} leer="Verglichen werden Zyklusphase, Training am selben Tag, die Nacht davor, deine Einflüsse im Tagebuch, Krankheitstage und deine Einnahmen." />}
        {zyklus.length > 0 && <Link href="/zyklus" className="settings-link">Wadenkrämpfe im Zyklus ›</Link>}
        {!a.ready && <span className="meta">Verglichen werden Zyklusphase, Training am selben Tag, die Nacht davor, deine Einflüsse im Tagebuch, Krankheitstage und deine Einnahmen, zum Beispiel Magnesium.</span>}
      </section>
    </>
  );
}
