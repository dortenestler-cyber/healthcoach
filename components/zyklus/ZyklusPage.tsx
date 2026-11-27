"use client";

import { markAutoRows } from "@/lib/insights";
import { useRefresh } from "@/lib/refresh";
import { useCallback, useEffect, useState } from "react";
import { loadOvulation, withOvulation } from "@/lib/ovulation";
import PageHead from "@/components/PageHead";
import ZyklusView, { type ZyklusAbschnitt } from "@/components/zyklus/ZyklusView";
import { useAbschnitte } from "@/components/ui/Pille";
import PeriodBackfill from "@/components/zyklus/PeriodBackfill";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { loadInsightData, loadMusterExtra } from "@/lib/insightData";
import type { MusterExtra } from "@/lib/muster";
import type { Data, Diary } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";
import { loadGarminCycles, mergeGarminCycles } from "@/lib/garminZyklus";

// Lädt die Daten für die Seite Zyklus: 6 Monate Werte, zwei Jahre Tagebuch, 12 Wochen Hitzewallungen.
// Unten: vergangene Perioden nachtragen (früher im Tagebuch).
export default function ZyklusPage() {
  const [data, setData] = useState<Data | null>(null);
  const [longDiary, setLongDiary] = useState<Diary[] | null>(null);
  const [flashes, setFlashes] = useState<string[]>([]);
  const [extra, setExtra] = useState<MusterExtra | null>(null);
  const [error, setError] = useState("");
  const feat = useFeatures();

  const load = useCallback(() => {
    const sb = supabase();
    if (!sb) return;
    Promise.all([
      loadInsightData(),
      sb.from("diary_entries").select("*").gte("day", isoDay(daysAgo(760))).order("day"),
      sb.from("hot_flashes").select("at").gte("at", daysAgo(90).toISOString()),
      loadGarminCycles(sb, isoDay(daysAgo(760))),
      loadMusterExtra(),
      loadOvulation(sb, isoDay(daysAgo(760))),
    ])
      .then(([d, diary, f, gc, x, ov]) => {
        setExtra(x);
        if (diary.error) throw new Error(diary.error.message);
        setData(d);
        setLongDiary(withOvulation(mergeGarminCycles(markAutoRows(((diary.data ?? []) as (Diary & { manual?: boolean })[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] }))), gc), ov));
        setFlashes(((f.data ?? []) as { at: string }[]).map((r) => r.at));
      })
      .catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  useRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  // Abschnitte ein- und ausblenden (Konzept Einfach, Paket 5); Perioden und Gewohnheiten zuerst aus
  const abschnitte = useAbschnitte<ZyklusAbschnitt>(
    "zyklus",
    [
      ["werte", "Werte"],
      ["symptome", "Symptome"],
      ["stimmung", "Stimmung"],
      ["gewohnheiten", "Gewohnheiten"],
      ["perioden", "Perioden"],
    ],
    ["werte", "symptome", "stimmung"],
  );

  // Link auf #perioden (Tagebuch, „Perioden nachtragen“): Abschnitt einschalten, nach dem Laden hinscrollen
  const [ziel, setZiel] = useState(false);
  useEffect(() => {
    const pruefen = () => {
      if (window.location.hash === "#perioden") setZiel(true);
    };
    pruefen();
    window.addEventListener("hashchange", pruefen);
    return () => window.removeEventListener("hashchange", pruefen);
  }, []);
  useEffect(() => {
    if (!ziel || !data || !longDiary) return;
    abschnitte.einschalten("perioden");
    setTimeout(() => document.getElementById("perioden")?.scrollIntoView(), 50);
    setZiel(false);
  }, [ziel, data, longDiary, abschnitte]);

  return (
    <>
      <PageHead title="Zyklus" tone="zyklus" kalender="zyklus" />
      {error && <p className="alert" role="alert">{error}</p>}
      {!error && (!data || !longDiary) && <p className="hint">Lädt …</p>}
      {data && longDiary && <ZyklusView today={isoDay()} data={data} longDiary={longDiary} flashes={flashes} showFlashes={feat.perimenopause} extra={feat.muskeln ? extra : null} zeile={abschnitte.zeile} zeigt={abschnitte.zeigt} />}
      {feat.zyklus && abschnitte.zeigt("perioden") && <PeriodBackfill onChanged={load} />}
    </>
  );
}
