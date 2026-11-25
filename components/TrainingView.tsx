"use client";

import Link from "next/link";
import { useRefresh } from "@/lib/refresh";
import { useCallback, useEffect, useState } from "react";
import TwoCol from "@/components/ui/TwoCol";
import PageHead from "@/components/PageHead";
import { useFeatures } from "@/lib/prefs";
import TargetSection from "@/components/training/TargetSection";
import WeekLoadCard from "@/components/training/WeekLoadCard";
import RatioCard from "@/components/training/RatioCard";
import BelastungZeitCard from "@/components/training/BelastungZeitCard";
import HabitCard from "@/components/training/HabitCard";
import { daysAgo, isoDay } from "@/lib/dates";
import { loadInsightData } from "@/lib/insightData";
import { firstAlltagDay, type Data } from "@/lib/insights";
import CalendarSection from "@/components/training/CalendarSection";
import InsightsSection from "@/components/training/InsightsSection";
import AlleAktivitaeten from "@/components/training/AlleAktivitaeten";
import SportIcon from "@/components/ui/SportIcon";
import { useAbschnitte } from "@/components/ui/Pille";
import { sportOf, SPORTS, type Sport } from "@/lib/training";
import { SPORT_SEITEN } from "@/lib/sportSeiten";

// Training (Konzept docs/konzept-einfach.md, Paket 4): zwei Reiter statt sechs.
// Übersicht: Status kompakt · Diese Woche (Streifen + Tagesblatt) · Deine Sportarten · Alle Aktivitäten.
// Auswertung: Ziel · Verlauf · Woche · Insights, per Abschnitts-Pillen ein- und ausblendbar.
// Karate, Kettlebell und Bouldern haben eigene Seiten (/training/karate usw.).
const TABS: [string, string][] = [
  ["uebersicht", "Übersicht"],
  ["auswertung", "Auswertung"],
];
// Alte Adressen (?t=kalender, ?t=insights) zeigen auf den passenden Reiter
const ALT: Record<string, string> = { kalender: "uebersicht", insights: "auswertung", auswertung: "auswertung", uebersicht: "uebersicht" };

export default function TrainingView({ initial }: { initial: string }) {
  const [tab, setTab] = useState(ALT[initial] ?? "uebersicht");
  useEffect(() => {
    if (ALT[initial]) setTab(ALT[initial]);
  }, [initial]);
  const feat = useFeatures();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  // Last mit Alltag (Standard) oder nur Training wie bei Garmin; merkt sich die Wahl auf diesem Gerät
  const [alltag, setAlltagState] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("hc-last-alltag") === "0") setAlltagState(false);
    } catch {
      // ohne Speicher bleibt der Standard
    }
  }, []);
  const setAlltag = (v: boolean) => {
    setAlltagState(v);
    try {
      localStorage.setItem("hc-last-alltag", v ? "1" : "0");
    } catch {
      // egal
    }
  };
  const hasAlltag = !!data && firstAlltagDay(data.daily) !== null;
  const withAlltag = hasAlltag && alltag;

  const loadData = useCallback(() => {
    loadInsightData()
      .then(setData)
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useRefresh(loadData);

  const abschnitte = useAbschnitte("training.auswertung", [
    ["ziel", "Ziel"],
    ["verlauf", "Verlauf"],
    ["woche", "Woche"],
    ["insights", "Insights"],
  ]);

  const alltagSchalter = hasAlltag && (
    <div className="segmented" role="group" aria-label="Welche Belastung zählt">
      <button type="button" aria-pressed={alltag} onClick={() => setAlltag(true)}>
        Mit Alltag
      </button>
      <button type="button" aria-pressed={!alltag} onClick={() => setAlltag(false)}>
        Nur Training
      </button>
    </div>
  );

  // Sportarten mit eigener Seite, nur eingeschaltete Funktionen
  const sportarten = SPORT_SEITEN.filter((s) => feat[s.feature]);
  const seit = isoDay(daysAgo(27));
  const anzahl = (sp: Sport) => (data ? new Set(data.acts.filter((a) => sportOf(a) === sp && (a.start_local ?? "") >= seit).map((a) => (a.start_local ?? "").slice(0, 10))).size + (data.done ?? []).filter((d) => d.sport === sp && d.day >= seit && !data.acts.some((a) => sportOf(a) === sp && (a.start_local ?? "").startsWith(d.day))).length : null);

  return (
    <>
      <PageHead title="Training" sub="Karate, Bouldern, Kettlebell und Ausdauer" tone="training" kalender="training" />
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="segmented segmented-tabs" role="group" aria-label="Bereich">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "uebersicht" && (
        <>
          {data && <RatioCard today={isoDay()} data={data} alltag={withAlltag} zusatz={alltagSchalter} />}
          <CalendarSection data={data} kompakt woche />
          {sportarten.length > 0 && (
            <section className="card" aria-label="Deine Sportarten">
              <h2>Deine Sportarten</h2>
              <div className="sport-kacheln">
                {sportarten.map((s) => {
                  const n = anzahl(s.sport);
                  return (
                    <Link key={s.slug} href={`/training/${s.slug}`} className="sport-kachel">
                      <span className="today-act-icon is-training" aria-hidden="true">
                        <SportIcon sport={s.sport} size={20} />
                      </span>
                      <span className="sport-kachel-name">{SPORTS[s.sport].label}</span>
                      <span className="sport-kachel-wert">{n === null ? "–" : `${n} ${n === 1 ? "Tag" : "Tage"}`}</span>
                      <span className="meta">in 4 Wochen</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          <AlleAktivitaeten />
        </>
      )}

      {tab === "auswertung" && (
        <>
          {alltagSchalter}
          {abschnitte.zeile}
          <TwoCol
            left={
              <>
                {abschnitte.zeigt("ziel") && feat.tagesziel && data && <TargetSection data={data} />}
                {abschnitte.zeigt("verlauf") && data && <BelastungZeitCard today={isoDay()} data={data} alltag={withAlltag} />}
              </>
            }
            right={
              <>
                {abschnitte.zeigt("woche") && <WeekLoadCard data={data} alltag={withAlltag} />}
                {abschnitte.zeigt("woche") && data && <HabitCard today={isoDay()} data={data} />}
              </>
            }
          />
          {abschnitte.zeigt("insights") && <InsightsSection data={data} />}
        </>
      )}
    </>
  );
}
