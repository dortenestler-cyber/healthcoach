"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRefresh, useToday } from "@/lib/refresh";
import { supabase } from "@/lib/supabase";
import DayHead from "@/components/heute/DayHead";
import RingRow from "@/components/heute/RingRow";
import DaySentence from "@/components/heute/DaySentence";
import Tagesempfehlung from "@/components/heute/Tagesempfehlung";
import GlanceTiles from "@/components/heute/GlanceTiles";
import TodayAgenda from "@/components/heute/TodayAgenda";
import RecentActivities from "@/components/heute/RecentActivities";
import ActivityQuestion from "@/components/heute/ActivityQuestion";
import SignHintCard from "@/components/heute/SignHintCard";
import TwoCol, { useTwoCols } from "@/components/ui/TwoCol";
import PullToRefresh from "@/components/ui/PullToRefresh";
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
  const today = useToday();
  const [day, setDay] = useState(today);
  const [focus, setFocus] = useState("readiness"); // Ring in der Mitte, steuert die Erklärkarte
  // Tageswechsel (A5): Wer gerade den alten Tag ansah, springt auf den neuen
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current !== today) {
      setDay((d) => (d === prevToday.current ? today : d));
      prevToday.current = today;
    }
  }, [today]);
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

  const gsync = useGarminSync(data, feat.garmin);
  useRefresh(loadData);
  const refresh = useCallback(() => {
    if (feat.garmin) gsync.sync(3);
    else loadData();
  }, [feat.garmin, gsync, loadData]);

  const twoCols = useTwoCols();
  const isToday = day === today;
  const rule = data ? dayRule(day, data, isToday ? rehaSports : []) : null;
  const now = new Date();
  const nowMinute = isToday ? now.getHours() * 60 + now.getMinutes() : 24 * 60 - 1;

  // Auf dem iPhone untereinander wie bisher, am Computer links „Auf einen Blick“ und Aktivitäten, rechts „Heute steht an“
  const glance = data && rule ? <GlanceTiles day={day} data={data} showGarmin={feat.garmin} /> : null;
  const agenda = isToday ? <TodayAgenda day={day} data={data} rule={rule} showPlan={feat.tagesplan} /> : null;
  const question = isToday && data && feat.garmin ? <ActivityQuestion acts={data.acts} onSaved={loadData} /> : null;
  const recent = data && feat.garmin ? <RecentActivities day={day} data={data} /> : null;

  return (
    <PullToRefresh onRefresh={refresh} busy={gsync.busy}>
      <DayHead day={day} today={today} lastSync={gsync.lastSync} failed={!!gsync.error || gsync.morningFailed} onDay={setDay} onRefresh={refresh} busy={gsync.busy} />
      {error && <p className="alert" role="alert">{error}</p>}
      {gsync.error && <p className="alert" role="alert">{gsync.error}</p>}
      {isToday && gsync.morningFailed && gsync.morning && (
        <p className="alert">
          Der Abruf heute Morgen um {clock(new Date(gsync.morning.at))} hat nicht geklappt. Zieh die Seite nach unten, um es jetzt zu versuchen. ({gsync.morning.message ?? "unbekannter Fehler"})
        </p>
      )}

      {data && rule && <RingRow day={day} data={data} rule={rule} nowMinute={nowMinute} showLoad={feat.tagesziel} showGarmin={feat.garmin} showCycle={feat.zyklus} onCenter={setFocus} />}

      {data && rule && (() => {
        const satz = <DaySentence focus={focus} day={day} data={data} rule={rule} nowMinute={nowMinute} isToday={isToday} showLoad={feat.tagesziel} />;
        // Heute schreibt der Coach die Empfehlung; bei Warnzeichen und an anderen Tagen bleibt der Satz nach festen Regeln
        return isToday && rule.level !== "warnzeichen" ? <Tagesempfehlung tag={day} ersatz={satz} /> : satz;
      })()}
      {isToday && data && <SignHintCard data={data} today={day} onSaved={loadData} />}

      {twoCols ? (
        <TwoCol
          left={
            <>
              {glance}
              {recent}
            </>
          }
          right={
            <>
              {agenda}
              {question}
            </>
          }
        />
      ) : (
        <>
          {glance}
          {agenda}
          {question}
          {recent}
        </>
      )}

      {!data && !error && <p className="meta">Lädt …</p>}
    </PullToRefresh>
  );
}
