"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DivergingBars, LineBand } from "@/components/charts";
import PageHead from "@/components/PageHead";
import ExplainCard from "@/components/ui/ExplainCard";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { cycleToday, groupOf } from "@/lib/cycle";
import { DEFAULT_HABITS, labelOf, loadHabitDetails, loadHabits, WANN_LABEL, type Habit, type HabitDetails } from "@/lib/habits";
import { flashesNextDay, frequency, hrvByPhase, MIN_NIGHTS, nightAfter, type NightRow } from "@/lib/habitStats";
import { MIN_DAYS as MOOD_MIN, moodByHabit } from "@/lib/stimmung";
import { loadInsightData } from "@/lib/insightData";
import type { Data } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";
import Raster from "@/components/ui/Raster";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const PHASE_LABEL = { menstruation: "Menstruation", follikel: "Follikelphase", eisprung: "Eisprung", luteal: "Lutealphase" } as const;
const WEEKS = 13;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const de = (v: number, d = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const joinDe = (p: string[]) => (p.length <= 1 ? p.join("") : `${p.slice(0, -1).join(", ")} und ${p[p.length - 1]}`);

// Einordnung einer Zeile der Nacht danach in Worten
function note(r: NightRow): { text: string; tone: string } {
  const d = r.c.diff;
  if (d === null) return { text: `Noch zu wenige Nächte: ${r.c.nWith} mit, ${r.c.nWithout} ohne (je ${MIN_NIGHTS} nötig)`, tone: "" };
  const small = r.key === "schlafwert" ? 3 : r.key === "hrv" ? 2 : r.key === "ruhepuls" ? 1 : r.key === "tief" ? 1 / 6 : r.key === "temp" ? 0.1 : 0.1;
  if (Math.abs(d) < small) return { text: "kein deutlicher Unterschied", tone: "" };
  const sign = d > 0 ? "+" : "−";
  const amount = r.key === "nacht" ? `${de(Math.abs(d) * 100)} Prozentpunkte` : r.key === "tief" ? `${de(Math.abs(d) * 60)} min` : r.key === "schlafwert" ? `${de(Math.abs(d))} Punkte` : r.fmt(Math.abs(d)).replace(/^\+/, "");
  const good = r.higherIsBetter === null ? null : (d > 0) === r.higherIsBetter;
  return { text: `${sign}${amount}`, tone: good === null ? "note-cycle" : good ? "note-good" : "note-warn" };
}

// Detailseite einer Gewohnheit (Konzept dunkel 2): wie oft, die Nacht danach, im Zyklus.
export default function HabitDetail({ habitKey }: { habitKey: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [flashes, setFlashes] = useState<string[]>([]);
  const [details, setDetails] = useState<Map<string, HabitDetails>>(new Map());
  const [error, setError] = useState("");
  const feat = useFeatures();
  const today = isoDay();
  const from = isoDay(daysAgo(90));

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadInsightData().then(setData).catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
    loadHabits(sb).then(setHabits).catch(() => undefined);
    sb.from("hot_flashes").select("at").gte("at", daysAgo(90).toISOString()).then(({ data: f }) => setFlashes(((f ?? []) as { at: string }[]).map((r) => r.at)));
    if (habitKey === "sauna") loadHabitDetails(sb, from).then(setDetails);
  }, [habitKey, from]);

  const label = labelOf(habits, habitKey);
  const f = data ? frequency(data.diary, habitKey, today) : null;
  const rows = data ? nightAfter(data, habitKey, from) : [];
  const phases = data ? hrvByPhase(data, habitKey, from) : [];
  const mood = data ? moodByHabit(data, [{ key: habitKey, label }])[0] : null;
  const moodRows = mood ? (Object.keys(PHASE_LABEL) as (keyof typeof PHASE_LABEL)[]).map((g) => ({ group: g, ...mood.byGroup[g] })) : [];
  const moodReady = moodRows.filter((r) => r.diff !== null);
  const moodTop = [...moodReady].sort((a, b) => Math.abs(b.diff as number) - Math.abs(a.diff as number))[0];
  const moodSentence = !moodReady.length
    ? `Der Vergleich der Stimmung je Phase erscheint ab je ${MOOD_MIN} Tagen mit und ohne „${label}“ in derselben Phase.`
    : Math.abs(moodTop.diff as number) < 0.3
      ? `In keiner Phase hängt „${label}“ bisher deutlich mit deiner Stimmung am nächsten Tag zusammen.`
      : `In der ${PHASE_LABEL[moodTop.group]} ist deine Stimmung am Tag nach „${label}“ ${(moodTop.diff as number) > 0 ? "höher" : "niedriger"} als sonst.`;
  const fl = data && feat.perimenopause && flashes.length ? flashesNextDay(data.diary, habitKey, flashes, from) : null;
  const temp = rows.find((r) => r.key === "temp");
  const month = MONTHS[Number(today.slice(5, 7)) - 1];
  const prevMonth = MONTHS[(Number(today.slice(5, 7)) + 10) % 12];

  // Sauna: übliche Gänge, Zeit und Kältebecken aus den Details
  const sauna = [...details.values()].map((d) => d.sauna).filter((x): x is NonNullable<typeof x> => !!x);
  const gaenge = sauna.map((s) => s.gaenge).filter((g): g is string => !!g).map((g) => (g === "4+" ? 4 : Number(g)));
  const wann = sauna.map((s) => s.wann).filter((w): w is string => !!w);
  const topWann = wann.length ? Object.entries(wann.reduce<Record<string, number>>((m, w) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
  const kalt = sauna.filter((s) => s.kaeltebecken).length;
  const facts = [
    f ? `${prevMonth} ${f.prevMonth}` : null,
    f && f.usual.length ? `meist ${joinDe(f.usual)}` : null,
    topWann ? `meist ${WANN_LABEL[topWann].toLowerCase()}` : null,
    gaenge.length ? `im Schnitt ${de(gaenge.reduce((a, b) => a + b, 0) / gaenge.length)} ${gaenge.length === 1 ? "Gang" : "Gänge"}` : null,
    sauna.length ? `Kältebecken ${kalt} von ${sauna.length} Mal` : null,
  ].filter(Boolean);

  // Raster der letzten 13 Wochen
  const mon = addDays(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
  const start = addDays(mon, -7 * (WEEKS - 1));
  const grid = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));

  // Satz zur Nacht danach
  const notable = rows.filter((r) => r.c.diff !== null && note(r).tone);
  const nightSentence = !rows.some((r) => r.c.diff !== null)
    ? `Der Vergleich erscheint ab je ${MIN_NIGHTS} Nächten mit und ohne „${label}“.`
    : notable.length
      ? `Nach „${label}“ ${notable.length === 1 ? "ist" : "sind"} ${joinDe(notable.map((r) => r.label))} ${notable.length === 1 ? (r0(notable[0]) ? "höher" : "niedriger") : "anders als sonst"}.`
      : `Nach „${label}“ sind deine Werte in der Nacht danach wie sonst.`;
  function r0(r: NightRow) {
    return (r.c.diff as number) > 0;
  }

  // Phasen: stärkster Unterschied
  const phReady = phases.filter((p) => p.c.diff !== null);
  const phTop = [...phReady].sort((a, b) => Math.abs(b.c.diff as number) - Math.abs(a.c.diff as number))[0];
  const phSentence = !phReady.length
    ? `Der Vergleich je Phase erscheint ab je ${MIN_NIGHTS} Nächten in derselben Phase.`
    : Math.abs(phTop.c.diff as number) < 2
      ? `In keiner Phase hängt „${label}“ bisher deutlich mit deiner HRV zusammen.`
      : phReady.length === 1
      ? `In der ${PHASE_LABEL[phReady[0].group]} hängt „${label}“ so mit deiner HRV zusammen.`
      : `In der ${PHASE_LABEL[phTop.group]} hängt „${label}“ am stärksten mit deiner HRV zusammen.`;

  return (
    <>
      <Link href="/gesundheit" className="back-link">‹ Gesundheit</Link>
      <PageHead title={label} tone="gesundheit" />
      {error && <p className="alert" role="alert">{error}</p>}
      {!data && !error && <p className="hint">Lädt …</p>}

      {data && f && (
        <>
          <section className="card">
            <div className="review-count">
              <span className="review-number">{f.month}</span>
              <span className="review-unit">Mal im {month}</span>
            </div>
            {facts.length > 0 && <span className="meta">{facts.join(" · ")}</span>}
            <Raster today={today} weeks={WEEKS} on={(d) => f.days.has(d)} tone="neutral" label={`${label} in den letzten ${WEEKS} Wochen: ${grid.filter((d) => f.days.has(d)).length} Tage`} keyOff="ohne" keyOn={label} />
          </section>

          <section className="card">
            <span className="eyebrow">Die Nacht danach</span>
            <h2 className="card-title-lg">{nightSentence}</h2>
            <div className="night-table">
              <div className="night-head" aria-hidden="true">
                <span />
                <span>Mit</span>
                <span>Ohne</span>
              </div>
              {rows.map((r) => {
                const n = note(r);
                const fmt = (v: number | null) => (v === null ? "–" : r.key === "nacht" ? `${de(v * 100)} %` : r.fmt(v));
                return (
                  <div key={r.key} className="night-row">
                    <div className="night-values">
                      <span className="row-strong">{r.label}</span>
                      <strong>{fmt(r.c.with)}</strong>
                      <span className="meta">{fmt(r.c.without)}</span>
                    </div>
                    <span className={`meta ${n.tone}`}>{n.text}</span>
                  </div>
                );
              })}
            </div>
            <span className="meta">
              {rows[0] ? `${rows[0].c.nWith} Nächte nach „${label}“ gegen ${rows[0].c.nWithout} ohne.` : ""}
            </span>
          </section>

          {feat.zyklus && (
            <section className="card">
              <span className="eyebrow eyebrow-cycle">In deinem Zyklus</span>
              <h2 className="card-title-lg">{phSentence}</h2>
              <DivergingBars
                fmt={(v) => `${Math.round(v)} ms`}
                scaleMin={8}
                neg="HRV niedriger"
                pos="HRV höher"
                label={`HRV in der Nacht danach je Phase: ${phases.map((p) => `${PHASE_LABEL[p.group]} ${p.c.diff === null ? "noch zu wenige Nächte" : `${(p.c.diff as number) > 0 ? "plus" : "minus"} ${Math.round(Math.abs(p.c.diff as number))} ms`}`).join(", ")}`}
                rows={phases.map((p) => ({
                  label: PHASE_LABEL[p.group],
                  value: p.c.diff,
                  note: p.c.diff === null ? `Noch zu wenige Nächte: ${p.c.nWith} von ${MIN_NIGHTS}` : `${p.c.nWith} Nächte mit ${label}`,
                }))}
              />
              {fl && (
                <div className="today-line">
                  <span className="row-strong">Hitzewallungen am Tag danach</span>
                  {fl.diff === null ? (
                    <span>Erscheint ab je {MIN_NIGHTS} Tagen mit und ohne „{label}“.</span>
                  ) : (
                    <div className="pattern-bars">
                      {[
                        { l: `Nach ${label}`, v: fl.with as number, hi: true },
                        { l: "Sonst", v: fl.without as number, hi: false },
                      ].map((b) => (
                        <div key={b.l} className="pattern-bar">
                          <span className="meta">{b.l}</span>
                          <span className="pattern-track"><span className={b.hi ? "pattern-fill pattern-warn" : "pattern-fill"} style={{ width: `${(b.v / Math.max(fl.with as number, fl.without as number, 0.1)) * 100}%` }} /></span>
                          <strong>{de(b.v, 1)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {feat.zyklus && (
            <section className="card">
              <span className="eyebrow eyebrow-cycle">Stimmung je Phase</span>
              <h2 className="card-title-lg">{moodSentence}</h2>
              <DivergingBars
                fmt={(v) => de(v, 1)}
                scaleMin={0.5}
                tone="cycle"
                neg="Stimmung niedriger"
                pos="Stimmung höher"
                label={`Stimmung am Tag nach ${label} je Phase: ${moodRows.map((r) => `${PHASE_LABEL[r.group]} ${r.diff === null ? "noch zu wenige Tage" : `${r.diff > 0 ? "plus" : "minus"} ${de(Math.abs(r.diff), 1)}`}`).join(", ")}`}
                rows={moodRows.map((r) => ({
                  label: PHASE_LABEL[r.group],
                  value: r.diff,
                  note: r.diff === null ? `Noch zu wenige Tage: ${r.nWith} mit, ${r.nWithout} ohne (je ${MOOD_MIN} nötig)` : `${r.nWith} Tage mit ${label}, ${r.nWithout} ohne`,
                }))}
              />
            </section>
          )}

          <span className="hint">Zusammenhänge aus deinen eigenen Daten, keine Empfehlung. Erst ab je {MIN_NIGHTS} Nächten mit und ohne.</span>
        </>
      )}
    </>
  );
}
