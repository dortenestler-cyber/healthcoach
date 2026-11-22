"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate, shortDate } from "@/lib/dates";
import { BLEEDING, GRID_ROWS, INFLUENCES, LEVELS, SYMPTOMS } from "@/lib/catalog";
import PageHead from "@/components/PageHead";
import DayIntakes from "@/components/tagebuch/DayIntakes";
import FlashCounter from "@/components/tagebuch/FlashCounter";
import PeriodBackfill from "@/components/tagebuch/PeriodBackfill";
import { useFeatures } from "@/lib/prefs";

type Entry = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[] };

const DAYS = 28;
// Symptom-Stärke 0 bis 3 in Amber
const heat = ["var(--line-soft)", "var(--warn-bg)", "var(--warn-mid)", "var(--warn)"];

const shift = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Tagebuch für heute oder einen vergangenen Tag: Blutung, Symptome, Einflüsse, Einnahmen, Hitzewallungen.
// Dazu vergangene Perioden schnell nachtragen.
export default function TagebuchView({ initial }: { initial?: string }) {
  const today = isoDay();
  const [day, setDay] = useState(initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) && initial <= today ? initial : today);
  const feat = useFeatures();
  const [bleeding, setBleeding] = useState(0);
  const [symptoms, setSymptoms] = useState<Record<string, number>>({});
  const [influences, setInfluences] = useState<string[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [h, d] = await Promise.all([
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(DAYS - 1))).order("day"),
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").eq("day", day).maybeSingle(),
    ]);
    if (h.error || d.error) {
      setError("Tagebuch konnte nicht geladen werden: " + (h.error ?? d.error)?.message);
      return;
    }
    setHistory((h.data ?? []) as Entry[]);
    const t = d.data as Entry | null;
    setBleeding(t?.bleeding ?? 0);
    setSymptoms(t?.symptoms ?? {});
    setInfluences(t?.influences ?? []);
    setSaved(!!t);
    setDirty(false);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    setSaved(false);
    setDirty(true);
  };
  // Tag wechseln: ungespeicherte Änderungen nicht still verwerfen
  const go = (d: string) => {
    if (d === day || d > today) return;
    if (dirty && !window.confirm("Deine Änderungen für diesen Tag sind noch nicht gespeichert. Trotzdem wechseln?")) return;
    setDay(d);
  };

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    const clean = Object.fromEntries(Object.entries(symptoms).filter(([, v]) => v > 0));
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day, bleeding, symptoms: clean, influences, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (e) {
      setError("Eintrag konnte nicht gespeichert werden: " + e.message);
      return;
    }
    setError("");
    setSaved(true);
    setDirty(false);
    load();
  };

  const byDay = new Map(history.map((h) => [h.day, h]));
  const days = Array.from({ length: DAYS }, (_, i) => isoDay(daysAgo(DAYS - 1 - i)));
  const cellColor = (rowKey: string, d: string) => {
    const e = d === day ? { day: d, bleeding, symptoms, influences } : byDay.get(d);
    if (!e) return "var(--line-soft)";
    if (rowKey === "blut") return e.bleeding > 0 ? "var(--menses-fg)" : "var(--line-soft)";
    return heat[e.symptoms?.[rowKey] ?? 0];
  };

  return (
    <>
      <PageHead title="Tagebuch" sub={(day === today ? "Eintrag für " : "Nachtrag für ") + longDate(new Date(day + "T12:00:00"))} />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="day-nav">
        <button type="button" className="btn btn-soft btn-44" aria-label="Vorheriger Tag" onClick={() => go(shift(day, -1))}>‹</button>
        <input type="date" className="input" aria-label="Tag wählen" max={today} value={day} onChange={(e) => e.target.value && go(e.target.value)} />
        <button type="button" className="btn btn-soft btn-44" aria-label="Nächster Tag" disabled={day >= today} onClick={() => go(shift(day, 1))}>›</button>
      </div>
      {day !== today && (
        <button type="button" className="btn btn-link btn-44" onClick={() => go(today)}>Zurück zu heute</button>
      )}

      <section className="card">
        <h2>Blutung</h2>
        <div className="grid-5">
          {BLEEDING.map((l, i) => (
            <button key={l} type="button" className="pill pill-box" aria-pressed={bleeding === i} onClick={() => { setBleeding(i); changed(); }}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-row">
          <h2>Symptome</h2>
          <span className="meta">Tippen: leicht, mittel, stark</span>
        </div>
        <div className="pills wrap">
          {SYMPTOMS.map((s) => {
            const v = symptoms[s.key] ?? 0;
            return (
              <button
                key={s.key}
                type="button"
                className={"pill level-" + v}
                onClick={() => { setSymptoms({ ...symptoms, [s.key]: (v + 1) % 4 }); changed(); }}
              >
                {s.label}{v ? " · " + LEVELS[v] : ""}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Einflüsse</h2>
        <div className="pills wrap">
          {INFLUENCES.map((f) => {
            const on = influences.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                className="pill"
                aria-pressed={on}
                onClick={() => { setInfluences(on ? influences.filter((x) => x !== f.key) : [...influences, f.key]); changed(); }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" className="btn btn-primary" onClick={save} disabled={saved}>
        {saved ? "Gespeichert" : day === today ? "Eintrag speichern" : "Nachtrag speichern"}
      </button>

      <DayIntakes key={"i" + day} day={day} />

      {feat.perimenopause && <FlashCounter key={"f" + day} day={day} />}

      <section className="card">
        <div className="card-row">
          <h2>Verlauf, 4 Wochen</h2>
          <span className="meta">{shortDate(daysAgo(DAYS - 1))} bis heute</span>
        </div>
        {GRID_ROWS.map((r) => (
          <div key={r.key} className="grid-row">
            <span className="grid-label">{r.label}</span>
            <div className="grid-28" aria-label={r.label + " der letzten 4 Wochen"}>
              {days.map((d) => (
                <span key={d} className="grid-cell" data-selected={d === day} style={{ background: cellColor(r.key, d) }} />
              ))}
            </div>
          </div>
        ))}
        <div className="legend">
          <span><i style={{ background: heat[1] }} />leicht</span>
          <span><i style={{ background: heat[2] }} />mittel</span>
          <span><i style={{ background: heat[3] }} />stark</span>
          <span><i style={{ background: "var(--menses-fg)" }} />Periode</span>
        </div>
        {history.length === 0 && <p>Sobald du Einträge machst, füllt sich das Raster.</p>}
      </section>

      {feat.zyklus && <PeriodBackfill onChanged={load} />}
    </>
  );
}
