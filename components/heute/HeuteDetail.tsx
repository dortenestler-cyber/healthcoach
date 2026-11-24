"use client";

import { useRefresh } from "@/lib/refresh";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DayBars, HalfGauge, ValueRing } from "@/components/charts";
import DaySentence from "@/components/heute/DaySentence";
import FactorList from "@/components/heute/FactorList";
import ExplainCard from "@/components/ui/ExplainCard";
import LoadCard from "@/components/heute/LoadCard";
import SleepCard from "@/components/heute/SleepCard";
import EnergyCard from "@/components/heute/EnergyCard";
import { countInRange, positionIn } from "@/lib/baseline";
import { energyDay } from "@/lib/energie";
import { duration, stressDay, stressSentence } from "@/lib/stress";
import { dayRule, PHASES, STAGES, windowText, type DayRule, type Stage } from "@/lib/cycle";
import { clock, isoDay, longDate, shiftDay } from "@/lib/dates";
import { weekIntensity, WHO_MINUTES } from "@/lib/trainingLoad";
import type { Data } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import { useFeatures } from "@/lib/prefs";
import { DETAILS, type DetailKey } from "@/lib/heuteDetails";
import { hm, metricRow, readinessFactors, readinessWhy, sleepAchieved, sleepNeed, vitalRows } from "@/lib/today";


const GLOW: Record<DetailKey, string> = { readiness: "heute", schlaf: "gesundheit", belastung: "training", stress: "stress", energie: "heute", intensitaet: "training" };

// Detailseite hinter einem Ring auf Heute (Aufbau nach Whoop: großer Wert, Einflussgrößen, ein Satz).
// Zeigt den Tag aus ?tag=, sonst heute.
export default function HeuteDetail({ k, day: dayParam }: { k: DetailKey; day?: string }) {
  const today = isoDay();
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) && dayParam <= today ? dayParam : today;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const feat = useFeatures();

  const load = useCallback(async () => {
    try {
      const d = await loadInsightData();
      if (d) setData(d);
    } catch (e) {
      setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);
  useRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  const rule = data ? dayRule(day, data) : null;
  const isToday = day === today;
  const now = new Date();
  const nowMinute = isToday ? now.getHours() * 60 + now.getMinutes() : 24 * 60 - 1;

  return (
    <>
      <header className="detail-head">
        <div className="page-glow" data-tone={GLOW[k]} aria-hidden="true" />
        <div className="detail-head-row">
          <Link href="/" className="detail-back" aria-label="Zurück zu Heute">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="detail-title">{DETAILS[k]}</h1>
          <span className="detail-back" aria-hidden="true" />
        </div>
        <p className="detail-day">{isToday ? "Heute" : longDate(new Date(day + "T12:00:00"))}</p>
      </header>

      {error && <p className="alert" role="alert">{error}</p>}
      {!data && !error && <p className="meta">Lädt …</p>}

      {data && rule && k === "readiness" && <ReadinessDetail day={day} data={data} rule={rule} showGarmin={feat.garmin} />}

      {data && k === "schlaf" && <SleepDetail day={day} data={data} />}

      {data && rule && k === "belastung" && <LoadCard day={day} data={data} target={rule.target} />}

      {data && k === "stress" && <StressDetail day={day} data={data} />}

      {data && k === "energie" && <EnergyDetail day={day} data={data} nowMinute={nowMinute} />}

      {data && rule && k === "intensitaet" && <IntensityDetail day={day} data={data} rule={rule} isToday={isToday} nowMinute={nowMinute} />}
    </>
  );
}

const STAGE_ORDER: Stage[] = ["erholen", "behutsam", "bereit", "volle-kraft"];
const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const shortDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });
const LEGEND_30 = "Heute gegen deine letzten 30 Tage, zyklusabhängige Werte gegen frühere Tage derselben Phase";

// Readiness (nach Whoop „Erholung“): großer Ring, Stufenleiste, vier Faktoren mit Pfeil, Satz, Vorschlag, weitere Werte der Nacht
function ReadinessDetail({ day, data, rule, showGarmin }: { day: string; data: Data; rule: DayRule; showGarmin: boolean }) {
  if (rule.level === "warnzeichen") {
    return (
      <section className="card">
        <div className="suggest suggest-warn" role="alert">
          <span className="row-strong">{rule.title}</span>
          <span>{rule.text}</span>
        </div>
      </section>
    );
  }
  const { value, stage, label } = rule.readiness;
  const factors = readinessFactors(day, data);
  const count = countInRange(factors.map((f) => ({ value: f.value, range: f.base.active })));
  const reason = readinessWhy(factors, label);
  const tone = rule.level === "phase" ? (rule.cycle.phase ? "suggest-cycle" : "") : rule.level === "reha" ? "suggest-training" : "suggest-warn";
  const phase = rule.cycle.phase ? PHASES[rule.cycle.phase].label : null;
  const night = showGarmin ? vitalRows(day, data).filter((r) => r.key !== "hrv" && r.key !== "ruhepuls") : [];

  return (
    <>
      <div className="ring-hero detail-hero">
        <ValueRing tone="recovery" size={208} value={value / 10} center={de1(value)} caption={label} label={`Readiness ${de1(value)} von 10, ${label}`} />
      </div>
      {!rule.target.enoughData && <p className="meta detail-center">Wird genauer, sobald 14 Tage Garmin-Daten da sind.</p>}
      <div className="stage-bar" aria-label={`Stufe: ${label}`}>
        {STAGE_ORDER.map((st) => (
          <div key={st} className="stage" data-on={st === stage}>
            <span />
            <small>{STAGES[st]}</small>
          </div>
        ))}
      </div>

      <section className="card detail-card">
        <FactorList rows={factors} legend={LEGEND_30} />
      </section>

      <ExplainCard tone="recovery" question={`Warum ist meine Readiness heute ${de1(value)} von 10 („${label}“)?`}>
        {reason ?? (count.total ? `${count.inRange} von ${count.total} Faktoren in deinem Bereich.` : "Deine Bereiche entstehen ab 14 Tagen Daten.")}
      </ExplainCard>

      <div className={"suggest " + tone}>
        <span className="row-strong">{rule.title}</span>
        <span>{rule.text}</span>
      </div>

      {night.length > 0 && (
        <section className="card detail-card">
          <span className="eyebrow">Weitere Werte der Nacht</span>
          <FactorList rows={night} tone="neutral" legend="Heute gegen deine letzten 30 Tage" />
        </section>
      )}

      <p className="meta">
        {rule.cycle.cycleDay !== null ? `Zyklustag ${rule.cycle.cycleDay}${phase ? " · " + phase + " (geschätzt)" : ""}` : "Zyklus: noch keine Periode im Tagebuch"}
        {rule.cycle.window ? ` · ${windowText(rule.cycle.window, isoDay())} (${rule.cycle.window.earliest === rule.cycle.window.latest ? shortDay(rule.cycle.window.earliest) : `${shortDay(rule.cycle.window.earliest)}–${shortDay(rule.cycle.window.latest)}`})` : ""}
      </p>
      <p className="meta">Vorschlag, keine Diagnose. Du entscheidest.</p>
    </>
  );
}

// Schlaf (nach Whoop „Schlafleistung“): großer Ring in % vom Bedarf, Faktoren mit drei Stufen, Satz, Schlafbedarf mit Herleitung, Phasen und 7 Nächte
function SleepDetail({ day, data }: { day: string; data: Data }) {
  const slept = sleepAchieved(day, data);
  const need = sleepNeed(day, data.daily, data.acts);
  const pct = slept.ratio === null ? null : Math.round(slept.ratio * 100);
  const night = data.daily.find((d) => d.day === day);
  const rows = [metricRow("schlaf", day, data, "Dauer"), metricRow("tiefschlaf", day, data), metricRow("rem", day, data)].filter((r, i) => i === 0 || r.value !== null);
  const count = countInRange(rows.map((r) => ({ value: r.value, range: r.base.active })));
  const deep = rows.find((r) => r.key === "tiefschlaf");
  const deepPos = deep && deep.value !== null && deep.base.active ? positionIn(deep.value, deep.base.active) : null;

  let sentence = "Für diese Nacht gibt es noch keinen Schlafwert.";
  if (pct !== null && slept.hours !== null) {
    sentence = pct >= 100 ? `Du hast ${hm(slept.hours)} geschlafen, so viel wie du brauchst.` : pct >= 90 ? `Du hast ${hm(slept.hours)} geschlafen, knapp unter deinem Bedarf.` : `Du hast ${hm(slept.hours)} geschlafen, deutlich unter deinem Bedarf.`;
    if (deepPos) sentence += deepPos === "im" ? " Tiefschlaf im Bereich." : ` Tiefschlaf ${deepPos} deinem Bereich.`;
  }

  return (
    <>
      <div className="ring-hero detail-hero">
        <ValueRing tone="sleep" size={208} value={slept.ratio ?? 0} center={pct === null ? "–" : `${pct} %`} caption="vom Bedarf" label={pct === null ? "Schlaf: noch kein Wert" : `Schlaf ${pct} Prozent vom Bedarf`} />
      </div>

      <section className="card detail-card">
        <FactorList rows={rows} mode="stufen" tone="sleep" legend="unter · im · über deinem Bereich (letzte 30 Nächte)" />
      </section>

      <ExplainCard tone="sleep" question="Wie kann ich meinen Schlaf verbessern?">
        {sentence} {count.total ? `${count.inRange} von ${count.total} Werten in deinem Bereich.` : ""}
      </ExplainCard>

      {night && (night.awake_count != null || night.sleep_awake_s || night.spo2_avg != null) && (
        <section className="card">
          <span className="eyebrow">Wach und Sauerstoff in der Nacht</span>
          <p className="value-big">
            {night.awake_count != null ? (night.awake_count === 0 ? "Nicht aufgewacht" : `${night.awake_count}× wach`) : night.sleep_awake_s ? duration(night.sleep_awake_s) : "–"}
          </p>
          <ul className="derive-list">
            {night.awake_count != null && night.sleep_awake_s ? <li>Wachzeit zusammen {duration(night.sleep_awake_s)}</li> : null}
            {night.spo2_avg != null && <li>Sauerstoff im Schlaf im Schnitt {Math.round(night.spo2_avg)} %{night.spo2_low != null ? `, niedrigster Wert ${Math.round(night.spo2_low)} %` : ""}</li>}
          </ul>
          <span className="meta">Bei Auffälligkeiten sprich mit deiner Ärztin oder deinem Arzt, die App stellt keine Diagnose.</span>
        </section>
      )}

      <section className="card">
        <span className="eyebrow">Schlafbedarf heute Nacht</span>
        <p className="value-big">etwa {hm(need.hours)}</p>
        <span className={need.debtH >= 0.25 ? "debt-line" : "meta"}>
          {!need.baseFromData ? "Schlafschuld zählt ab 14 Nächten mit Schlafwerten." : need.debtH < 0.25 ? "Diese Woche keine Schlafschuld." : `Diese Woche etwa ${hm(need.debtH)} unter deinem Grundbedarf.`}
        </span>
        <ul className="derive-list">
          <li>
            Grundbedarf {hm(need.baseH)} {need.baseFromData ? "(dein üblicher Schlaf der letzten 30 Nächte)" : "(Startwert, eigener Wert ab 14 Nächten)"}
          </li>
          <li>
            Schlafschuld der letzten 7 Nächte {hm(need.debtH)}, davon {need.debtAddMin} min dazu
          </li>
          <li>{need.loadAddMin ? `${need.loadAddMin} min dazu nach deiner Belastung` : "Kein Zuschlag für Belastung"}</li>
        </ul>
        <span className="meta">Richtwerte aus deinen Daten, keine Diagnose.</span>
      </section>

      <section className="card">
        <span className="eyebrow">Schlafphasen und 7 Nächte</span>
        <SleepCard data={data} />
      </section>
    </>
  );
}

// Stress (nach Whoop „Stress-Monitor“): Halbbogen 0–100 in Türkis, Satz, Aufteilung, Tag gegen üblichen Wochentag.
// Den Verlauf über den Tag liefert Garmin nicht.
function StressDetail({ day, data }: { day: string; data: Data }) {
  const s = stressDay(day, data.daily);
  const synced = data.daily.find((d) => d.day === day)?.synced_at;
  const max = Math.max(s.value ?? 0, s.usual ?? 0, 1);
  return (
    <>
      <div className="gauge-wrap detail-hero">
        <HalfGauge tone="stress" value={(s.value ?? 0) / 100} center={s.value === null ? "–" : String(s.value)} caption={s.word ?? "kein Wert"} label={s.value === null ? "Stress: noch kein Wert" : `Stress im Tagesschnitt ${s.value} von 100, ${s.word}`} />
      </div>
      <p className="gauge-meta detail-center">Tagesschnitt 0–100{synced ? ` · Stand ${clock(new Date(synced))}` : ""}</p>

      <ExplainCard tone="stress" question={s.value === null ? undefined : `Mein Stress liegt heute bei ${s.value} (${s.word}). Was kann ich dagegen tun?`}>
        {stressSentence(s)}
      </ExplainCard>

      {s.split && (
        <section className="card">
          <span className="eyebrow">So verteilt sich dein Tag</span>
          <div className="split-bars" role="img" aria-label={`Aufteilung: ${s.split.map((p) => `${p.label} ${Math.round(p.share * 100)} Prozent, ${duration(p.seconds)}`).join(", ")}`}>
            {s.split.map((p, i) => (
              <div key={p.key} className="split-row">
                <div className="split-head">
                  <span>{p.label}</span>
                  <span>
                    <strong>{Math.round(p.share * 100)} %</strong> · {duration(p.seconds)}
                  </span>
                </div>
                <div className="split-track">
                  <span className={`split-fill stress-${i}`} style={{ width: `${Math.max(1, p.share * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.value !== null && (
        <section className="card">
          <span className="eyebrow">Tag gesamt</span>
          <h2>{s.usual === null ? `Der Vergleich mit einem üblichen ${s.weekday} entsteht ab 3 Wochen.` : Math.abs(s.value - s.usual) < 5 ? `So ruhig wie ein üblicher ${s.weekday}.` : s.value < s.usual ? `Ruhiger als ein üblicher ${s.weekday}.` : `Angespannter als ein üblicher ${s.weekday}.`}</h2>
          <div className="split-bars">
            {[
              ["Heute", s.value, "stress-3"],
              [`Üblicher ${s.weekday}`, s.usual, "stress-1"],
            ].map(([l, v, c]) =>
              v === null ? null : (
                <div key={l as string} className="split-row">
                  <div className="split-head">
                    <span>{l}</span>
                    <strong>{Math.round(v as number)}</strong>
                  </div>
                  <div className="split-track">
                    <span className={`split-fill ${c}`} style={{ width: `${((v as number) / max) * 100}%` }} />
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <p className="meta"><a href="#verlauf">Stress über die Zeit ↓</a></p>
    </>
  );
}

// Energie: großer Ring mit der Body Battery jetzt, darunter die Kurve über den Tag mit Hochrechnung und Tagesrhythmus
function EnergyDetail({ day, data, nowMinute }: { day: string; data: Data; nowMinute: number }) {
  const e = energyDay(day, data.daily, data.acts, nowMinute);
  const last = [...e.today].reverse().find((v) => v !== null) ?? null;
  return (
    <>
      <div className="ring-hero detail-hero">
        <ValueRing tone="energy" size={208} value={(last ?? 0) / 100} center={last === null ? "–" : String(Math.round(last))} caption="Body Battery" label={last === null ? "Energie: noch kein Wert" : `Body Battery ${Math.round(last)} von 100`} />
      </div>
      <EnergyCard day={day} data={data} nowMinute={nowMinute} hideValue />
    </>
  );
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const mondayOf = (iso: string) => shiftDay(iso, -((new Date(iso + "T12:00:00").getDay() + 6) % 7));

// Intensitätsminuten der Woche (Montag bis heute) gegen die Empfehlung der WHO: großer Ring, Satz, Tage der Woche, 4 Wochen.
function IntensityDetail({ day, data, rule, isToday, nowMinute }: { day: string; data: Data; rule: DayRule; isToday: boolean; nowMinute: number }) {
  const im = weekIntensity(day, data);
  const mon = mondayOf(day);
  const byDay = new Map(data.daily.map((d) => [d.day, d.intensity_minutes]));
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(mon, i));
  const weeks = Array.from({ length: 4 }, (_, i) => shiftDay(mon, -7 * (3 - i))).map((m) => ({ m, sum: weekIntensity(m === mon ? day : shiftDay(m, 6), data) }));
  const reached = weeks.filter((w) => w.sum >= WHO_MINUTES).length;
  return (
    <>
      <div className="ring-hero detail-hero">
        <ValueRing tone="training" size={208} value={im / WHO_MINUTES} center={String(im)} caption={`von ${WHO_MINUTES} min`} label={`Intensitätsminuten diese Woche ${im} von ${WHO_MINUTES}`} />
      </div>
      <p className="gauge-meta detail-center">Montag bis {isToday ? "heute" : shortDay(day)} · Empfehlung der WHO</p>

      <DaySentence focus="intensitaet" day={day} data={data} rule={rule} nowMinute={nowMinute} isToday={isToday} showLoad={false} />

      <section className="card">
        <span className="eyebrow">Diese Woche</span>
        <h2>{im >= WHO_MINUTES ? "Wochenziel erreicht." : `Noch ${WHO_MINUTES - im} Minuten bis ${WHO_MINUTES}.`}</h2>
        <DayBars
          tone="training"
          fmt={(v) => `${Math.round(v)} min`}
          label={`Intensitätsminuten je Tag: ${week.map((d) => `${WEEKDAY[new Date(d + "T12:00:00").getDay()]} ${d > day ? "noch offen" : `${byDay.get(d) ?? 0} Minuten`}`).join(", ")}`}
          bars={week.map((d) => ({ label: WEEKDAY[new Date(d + "T12:00:00").getDay()], value: d > day ? null : (byDay.get(d) ?? 0), today: d === day, date: d }))}
        />
      </section>

      <section className="card">
        <span className="eyebrow">Letzte 4 Wochen</span>
        <h2>{reached === 0 ? "In keiner der letzten 4 Wochen 150 Minuten erreicht." : `In ${reached} von 4 Wochen 150 Minuten erreicht.`}</h2>
        <DayBars
          tone="training"
          fmt={(v) => `${Math.round(v)} min`}
          label={`Intensitätsminuten je Woche: ${weeks.map((w) => `Woche ab ${shortDay(w.m)} ${w.sum} Minuten`).join(", ")}`}
          target={WHO_MINUTES}
          targetLabel={`Empfehlung ${WHO_MINUTES} min`}
          bars={weeks.map((w) => ({ label: shortDay(w.m), value: w.sum, today: w.m === mon, tip: `Woche ab ${shortDay(w.m)}` }))}
        />
      </section>

      <p className="meta">Garmin zählt intensive Minuten doppelt. <Link href="/training">Training ›</Link></p>
    </>
  );
}
