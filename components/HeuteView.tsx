"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clock, isoDay, longDate, startOfToday } from "@/lib/dates";
import { CHECKIN_LEVELS, CHECKIN_QUESTIONS } from "@/lib/catalog";
import PageHead from "@/components/PageHead";
import HealthToday from "@/components/HealthToday";
import TodayPlan from "@/components/TodayPlan";
import ReadinessCard from "@/components/heute/ReadinessCard";
import SymptomChips from "@/components/heute/SymptomChips";
import TodayRings from "@/components/heute/TodayRings";
import HrvCard from "@/components/heute/HrvCard";
import SleepCard from "@/components/heute/SleepCard";
import VitalsCard from "@/components/heute/VitalsCard";
import { readinessFactors } from "@/lib/today";
import { loadInsightData } from "@/lib/insightData";
import { dayRule } from "@/lib/cycle";
import { SPOTS } from "@/lib/health";
import { SPORTS, type Sport } from "@/lib/training";
import type { Data, Diary } from "@/lib/insights";
import { useFeatures } from "@/lib/prefs";

type Checkin = { energy: number | null; sleep: number | null; mood: number | null };
const empty: Checkin = { energy: null, sleep: null, mood: null };

export default function HeuteView() {
  const [checkin, setCheckin] = useState<Checkin>(empty);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [flashes, setFlashes] = useState<Date[]>([]);
  const [error, setError] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [rehaSports, setRehaSports] = useState<string[]>([]);
  const [chipBusy, setChipBusy] = useState(false);
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

  const todayEntry: Diary = data?.diary.find((d) => d.day === today) ?? { day: today, bleeding: 0, symptoms: {}, influences: [] };

  // Symptom-Chip: an = „mittel“ (2), aus = entfernt. Rest des Tagebuch-Eintrags bleibt erhalten.
  const toggleSymptom = async (key: string) => {
    const sb = supabase();
    if (!sb || !data) return;
    const symptoms = { ...todayEntry.symptoms };
    if ((symptoms[key] ?? 0) > 0) delete symptoms[key];
    else symptoms[key] = 2;
    const entry: Diary = { ...todayEntry, symptoms };
    const before = data;
    setData({ ...data, diary: [...data.diary.filter((d) => d.day !== today), entry].sort((a, b) => a.day.localeCompare(b.day)) });
    setChipBusy(true);
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day: today, bleeding: entry.bleeding, symptoms, influences: entry.influences, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    setChipBusy(false);
    if (e) {
      setData(before);
      setError("Symptom konnte nicht gespeichert werden: " + e.message);
    } else setError("");
  };

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [c, f] = await Promise.all([
      sb.from("checkins").select("energy, sleep, mood").eq("day", today).maybeSingle(),
      sb.from("hot_flashes").select("at").gte("at", startOfToday().toISOString()).order("at", { ascending: false }),
    ]);
    if (c.error || f.error) {
      setError("Daten konnten nicht geladen werden: " + (c.error ?? f.error)?.message);
      return;
    }
    if (c.data) {
      setCheckin({ energy: c.data.energy, sleep: c.data.sleep, mood: c.data.mood });
      setCheckinSaved(true);
    }
    setFlashes((f.data ?? []).map((r: { at: string }) => new Date(r.at)));
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCheckin = async () => {
    const sb = supabase();
    if (!sb) return;
    const { error: e } = await sb.from("checkins").upsert({ day: today, ...checkin, source: "app" }, { onConflict: "user_id,day" });
    if (e) setError("Check-in konnte nicht gespeichert werden: " + e.message);
    else {
      setError("");
      setCheckinSaved(true);
    }
  };

  const addFlash = async () => {
    const sb = supabase();
    if (!sb) return;
    const now = new Date();
    setFlashes((list) => [now, ...list]);
    const { error: e } = await sb.from("hot_flashes").insert({ at: now.toISOString(), source: "app" });
    if (e) {
      setFlashes((list) => list.slice(1));
      setError("Hitzewallung konnte nicht gespeichert werden: " + e.message);
    }
  };

  const rule = data ? dayRule(today, data, rehaSports) : null;
  const complete = CHECKIN_QUESTIONS.every((q) => checkin[q.key] !== null);

  return (
    <>
      <PageHead title="Heute" sub={longDate()} />
      {error && <p className="alert" role="alert">{error}</p>}

      {data && rule && <TodayRings day={today} data={data} rule={rule} showLoad={feat.tagesziel} />}

      {data && rule && <ReadinessCard rule={rule} factors={readinessFactors(today, data)} />}

      <HealthToday />

      {feat.perimenopause && <SymptomChips symptoms={todayEntry.symptoms ?? {}} busy={chipBusy || !data} onToggle={toggleSymptom} />}

      {data && <HrvCard data={data} showPhases={feat.zyklus} />}

      {feat.garmin && data && <SleepCard data={data} />}

      {feat.garmin && <VitalsCard day={today} data={data} onSynced={loadData} />}

      {feat.tagesplan && <TodayPlan />}

      <section className="card">
        <div className="card-row">
          <h2>Morgen-Check-in</h2>
          <span className="meta">{checkinSaved ? "Gespeichert" : "30 Sekunden"}</span>
        </div>
        {CHECKIN_QUESTIONS.map((q) => (
          <div key={q.key} className="card-row">
            <span className="row-label">{q.label}</span>
            <div className="pills">
              {CHECKIN_LEVELS.map((l, i) => (
                <button
                  key={l}
                  type="button"
                  className="pill pill-sm"
                  aria-pressed={checkin[q.key] === i + 1}
                  onClick={() => {
                    setCheckin({ ...checkin, [q.key]: i + 1 });
                    setCheckinSaved(false);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!checkinSaved && (
          <button type="button" className="btn btn-dark" disabled={!complete} onClick={saveCheckin}>
            Check-in speichern
          </button>
        )}
      </section>

      {feat.perimenopause && <section className="card">
        <div className="card-row">
          <div className="stack">
            <span className="meta">Hitzewallungen heute</span>
            <span className="big-number">{flashes.length}</span>
            <span className="meta">{flashes[0] ? "Zuletzt " + clock(flashes[0]) : "Noch keine"}</span>
          </div>
          <button type="button" className="btn btn-soft" onClick={addFlash}>
            + Eintragen
          </button>
        </div>
      </section>}
    </>
  );
}
