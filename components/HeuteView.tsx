"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay, longDate } from "@/lib/dates";
import PageHead from "@/components/PageHead";
import ReadinessCard from "@/components/heute/ReadinessCard";
import TodayRings from "@/components/heute/TodayRings";
import TodayAgenda from "@/components/heute/TodayAgenda";
import ValuesCard from "@/components/heute/ValuesCard";
import EnergyCard from "@/components/heute/EnergyCard";
import { readinessFactors } from "@/lib/today";
import { loadInsightData } from "@/lib/insightData";
import { dayRule } from "@/lib/cycle";
import { SPOTS } from "@/lib/health";
import { SPORTS, type Sport } from "@/lib/training";
import type { Data } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";

// Heute beantwortet: Wie geht es mir, was steht heute an? Eingetragen wird im Tagebuch.
// 1 Ringe · 2 Readiness · 3 Heute steht an · 4 Deine Werte · 5 Energie über den Tag
export default function HeuteView() {
  const [error, setError] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [rehaSports, setRehaSports] = useState<string[]>([]);
  const today = isoDay();
  const feat = useFeatures();

  const loadData = useCallback(async () => {
    try {
      const d = await loadInsightData();
      if (d) setData(d);
      const inj = await supabase()?.from("injuries").select("spot").is("ended_on", null);
      const sports = ((inj?.data ?? []) as { spot: string }[]).flatMap((i) => SPOTS[i.spot]?.sports ?? []);
      setRehaSports([...new Set(sports)].map((s) => SPORTS[s as Sport]?.label ?? s));
    } catch (e) {
      setError("Readiness konnte nicht berechnet werden: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rule = data ? dayRule(today, data, rehaSports) : null;

  return (
    <>
      <PageHead title="Heute" sub={longDate()} tone="heute" />
      {error && <p className="alert" role="alert">{error}</p>}

      {data && rule && <TodayRings day={today} data={data} rule={rule} showLoad={feat.tagesziel} />}

      {data && rule && <ReadinessCard rule={rule} factors={readinessFactors(today, data)} />}

      <TodayAgenda day={today} data={data} rule={rule} showPlan={feat.tagesplan} showLoad={feat.tagesziel} />

      {feat.garmin && <ValuesCard day={today} data={data} showPhases={feat.zyklus} onSynced={loadData} />}

      {feat.garmin && data && <EnergyCard day={today} data={data} nowMinute={new Date().getHours() * 60 + new Date().getMinutes()} />}
    </>
  );
}
