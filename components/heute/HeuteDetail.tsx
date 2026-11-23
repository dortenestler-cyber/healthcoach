"use client";

import Link from "next/link";
import TwoCol from "@/components/ui/TwoCol";
import { useCallback, useEffect, useState } from "react";
import { RangeRow, ValueRing } from "@/components/charts";
import ReadinessCard from "@/components/heute/ReadinessCard";
import LoadCard from "@/components/heute/LoadCard";
import SleepCard from "@/components/heute/SleepCard";
import HrvCard from "@/components/heute/HrvCard";
import StressCard from "@/components/heute/StressCard";
import EnergyCard from "@/components/heute/EnergyCard";
import { RANGE_PHASE_NAMES } from "@/lib/baseline";
import { dayRule } from "@/lib/cycle";
import { isoDay, longDate } from "@/lib/dates";
import type { Data } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import { useFeatures } from "@/lib/prefs";
import { DETAILS, type DetailKey } from "@/lib/heuteDetails";
import { hm, readinessFactors, sleepAchieved, sleepNeed, vitalRows } from "@/lib/today";


const GLOW: Record<DetailKey, string> = { readiness: "heute", schlaf: "gesundheit", belastung: "training", stress: "stress", energie: "heute" };

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

      {data && rule && k === "readiness" && (
        <TwoCol
          left={<ReadinessCard rule={rule} factors={readinessFactors(day, data)} open />}
          right={
            <>
              {feat.garmin && <NightValues day={day} data={data} />}
              {feat.garmin && (
                <section className="card">
                  <HrvCard data={data} showPhases={feat.zyklus} />
                </section>
              )}
            </>
          }
        />
      )}

      {data && k === "schlaf" && <SleepDetail day={day} data={data} />}

      {data && rule && k === "belastung" && <LoadCard day={day} data={data} target={rule.target} />}

      {data && k === "stress" && (
        <section className="card">
          <span className="eyebrow">Stress</span>
          <StressCard day={day} data={data} />
        </section>
      )}

      {data && k === "energie" && <EnergyCard day={day} data={data} nowMinute={nowMinute} />}
    </>
  );
}

// Weitere Werte der Nacht (Atemfrequenz, Hauttemperatur, Body Battery, Stress) mit deinem Bereich
function NightValues({ day, data }: { day: string; data: Data }) {
  const rows = vitalRows(day, data).filter((r) => r.key !== "hrv" && r.key !== "ruhepuls");
  const hasTemp = data.daily.some((d) => typeof d.skin_temp_delta === "number");
  return (
    <section className="card">
      <span className="eyebrow">Weitere Werte der Nacht</span>
      <div className="factor-list">
        {rows.map((r) => (
          <Link key={r.key} href={r.href ?? `/verlauf?m=${r.key}`} className="row-link">
            <RangeRow label={r.label} value={r.value} fmt={r.fmt} range={r.base.range} phase={r.base.phase} phaseName={r.base.phaseKey ? RANGE_PHASE_NAMES[r.base.phaseKey] : undefined} tone="neutral" />
          </Link>
        ))}
        {!hasTemp && <span className="meta">Hauttemperatur kommt noch nicht von Garmin an.</span>}
        <span className="meta factor-foot">Punkt = heute, Band = deine letzten 30 Tage, bei zyklusabhängigen Werten deine Zyklusphase. Tippen öffnet den Verlauf.</span>
      </div>
    </section>
  );
}

// Schlaf: großer Ring in % vom Bedarf, Schlafbedarf heute Nacht mit Herleitung, dann Phasen und 7 Nächte
function SleepDetail({ day, data }: { day: string; data: Data }) {
  const slept = sleepAchieved(day, data);
  const need = sleepNeed(day, data.daily, data.acts);
  const pct = slept.ratio === null ? null : Math.round(slept.ratio * 100);
  return (
    <>
      <section className="card">
        <div className="ring-hero">
          <ValueRing tone="sleep" size={208} value={slept.ratio ?? 0} center={pct === null ? "–" : `${pct} %`} caption="vom Bedarf" label={pct === null ? "Schlaf: noch kein Wert" : `Schlaf ${pct} Prozent vom Bedarf`} />
        </div>
        <div className="today-line">
          <span>{slept.hours === null ? "Für diese Nacht gibt es noch keinen Schlafwert." : `Geschlafen ${hm(slept.hours)}, das sind ${pct} % vom Bedarf.`}</span>
          <span className="row-strong">Schlafbedarf heute Nacht etwa {hm(need.hours)}</span>
          <span className={need.debtH >= 0.25 ? "debt-line" : undefined}>
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
        </div>
        <span className="meta">Richtwerte aus deinen Daten, keine Diagnose.</span>
      </section>
      <section className="card">
        <span className="eyebrow">Schlafphasen und 7 Nächte</span>
        <SleepCard data={data} />
      </section>
    </>
  );
}
