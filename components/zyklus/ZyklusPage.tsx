"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import ZyklusView from "@/components/zyklus/ZyklusView";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { loadInsightData } from "@/lib/insightData";
import type { Data, Diary } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";

// Lädt die Daten für die Seite Zyklus: 6 Monate Werte, zwei Jahre Tagebuch, 12 Wochen Hitzewallungen
export default function ZyklusPage() {
  const [data, setData] = useState<Data | null>(null);
  const [longDiary, setLongDiary] = useState<Diary[] | null>(null);
  const [flashes, setFlashes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const feat = useFeatures();

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    Promise.all([
      loadInsightData(),
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(760))).order("day"),
      sb.from("hot_flashes").select("at").gte("at", daysAgo(90).toISOString()),
    ])
      .then(([d, diary, f]) => {
        if (diary.error) throw new Error(diary.error.message);
        setData(d);
        setLongDiary(((diary.data ?? []) as Diary[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] })));
        setFlashes(((f.data ?? []) as { at: string }[]).map((r) => r.at));
      })
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  return (
    <>
      <PageHead title="Zyklus" sub="Dein Zyklus und was sich darin wiederholt" />
      {error && <p className="alert" role="alert">{error}</p>}
      {!error && (!data || !longDiary) && <p className="hint">Lädt …</p>}
      {data && longDiary && <ZyklusView today={isoDay()} data={data} longDiary={longDiary} flashes={flashes} showFlashes={feat.perimenopause} />}
    </>
  );
}
