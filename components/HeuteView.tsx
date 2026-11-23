"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import DayHead from "@/components/heute/DayHead";
import RingRow from "@/components/heute/RingRow";
import DaySentence from "@/components/heute/DaySentence";
import GlanceTiles from "@/components/heute/GlanceTiles";
import TodayAgenda from "@/components/heute/TodayAgenda";
import RecentActivities from "@/components/heute/RecentActivities";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { readinessFactors } from "@/lib/today";
import { loadInsightData } from "@/lib/insightData";
import { dayRule } from "@/lib/cycle";
import { SPOTS } from "@/lib/health";
import { SPORTS, type Sport } from "@/lib/training";
import type { Data } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";
import { useGarminSync } from "@/lib/useGarminSync";
import { clock } from "@/lib/dates";

// Heute als ruhige Einstiegsseite (docs/konzept-heute-einstieg.md, nach Sonar):
// 1 Gruß und Datum · 2 Dein Tag (fünf Ringe) · 3 ein Satz zum Tag · 4 Auf einen Blick · 5 Heute steht an · 6 Letzte Aktivitäten.
// Alles Weitere liegt einen Tipp tiefer auf den Detailseiten /heute/… . Ziehen nach unten synchronisiert Garmin.
export default function HeuteView() {
  const [error, setError] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [rehaSports, setRehaSports] = useState<string[]>([]);
  const today = isoDay();
  const [day, setDay] = useState(today);
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

  const gsync = useGarminSync(data, loadData, feat.garmin);
  const refresh = useCallback(() => {
    if (feat.garmin) gsync.sync(3);
    else loadData();
  }, [feat.garmin, gsync, loadData]);

  const isToday = day === today;
  const rule = data ? dayRule(day, data, isToday ? rehaSports : []) : null;
  const now = new Date();
  const nowMinute = isToday ? now.getHours() * 60 + now.getMinutes() : 24 * 60 - 1;

  return (
    <PullToRefresh onRefresh={refresh} busy={gsync.busy}>
      <DayHead day={day} today={today} lastSync={gsync.lastSync} failed={!!gsync.error || gsync.morningFailed} onDay={setDay} />
      {error && <p className="alert" role="alert">{error}</p>}
      {gsync.error && <p className="alert" role="alert">{gsync.error}</p>}
      {isToday && gsync.morningFailed && gsync.morning && (
        <p className="alert">
          Der Abruf heute Morgen um {clock(new Date(gsync.morning.at))} hat nicht geklappt. Zieh die Seite nach unten, um es jetzt zu versuchen. ({gsync.morning.message ?? "unbekannter Fehler"})
        </p>
      )}
      {gsync.note && <span className="meta">{gsync.note}</span>}

      {data && rule && <RingRow day={day} data={data} rule={rule} nowMinute={nowMinute} showLoad={feat.tagesziel} showGarmin={feat.garmin} />}

      {data && rule && <DaySentence rule={rule} factors={readinessFactors(day, data)} showLoad={feat.tagesziel} />}

      {data && rule && <GlanceTiles day={day} data={data} rule={rule} showGarmin={feat.garmin} showCycle={feat.zyklus} />}

      {isToday && <TodayAgenda day={day} data={data} rule={rule} showPlan={feat.tagesplan} />}

      {data && feat.garmin && <RecentActivities day={day} data={data} />}

      {!data && !error && <p className="meta">Lädt …</p>}
    </PullToRefresh>
  );
}
