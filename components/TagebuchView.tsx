"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate, shortDate } from "@/lib/dates";
import { BLEEDING, GRID_ROWS, INFLUENCES, LEVELS, SYMPTOMS } from "@/lib/catalog";
import PageHead from "@/components/PageHead";

type Entry = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[] };

const DAYS = 28;
// Symptom-Stärke 0 bis 3 in Amber
const heat = ["var(--line-soft)", "var(--warn-bg)", "var(--warn-mid)", "var(--warn)"];

export default function TagebuchView() {
  const today = isoDay();
  const [bleeding, setBleeding] = useState(0);
  const [symptoms, setSymptoms] = useState<Record<string, number>>({});
  const [influences, setInfluences] = useState<string[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb
      .from("diary_entries")
      .select("day, bleeding, symptoms, influences")
      .gte("day", isoDay(daysAgo(DAYS - 1)))
      .order("day");
    if (e) {
      setError("Tagebuch konnte nicht geladen werden: " + e.message);
      return;
    }
    const rows = (data ?? []) as Entry[];
    setHistory(rows);
    const t = rows.find((r) => r.day === today);
    if (t) {
      setBleeding(t.bleeding);
      setSymptoms(t.symptoms ?? {});
      setInfluences(t.influences ?? []);
      setSaved(true);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => setSaved(false);

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    const clean = Object.fromEntries(Object.entries(symptoms).filter(([, v]) => v > 0));
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day: today, bleeding, symptoms: clean, influences, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (e) {
      setError("Eintrag konnte nicht gespeichert werden: " + e.message);
      return;
    }
    setError("");
    setSaved(true);
    load();
  };

  const byDay = new Map(history.map((h) => [h.day, h]));
  const days = Array.from({ length: DAYS }, (_, i) => isoDay(daysAgo(DAYS - 1 - i)));
  const cellColor = (rowKey: string, day: string) => {
    const e = day === today ? { day, bleeding, symptoms, influences } : byDay.get(day);
    if (!e) return "var(--line-soft)";
    if (rowKey === "blut") return e.bleeding > 0 ? "var(--menses-fg)" : "var(--line-soft)";
    return heat[e.symptoms?.[rowKey] ?? 0];
  };

  return (
    <>
      <PageHead title="Tagebuch" sub={"Eintrag für " + longDate()} />
      {error && <p className="alert" role="alert">{error}</p>}

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
                <span key={d} className="grid-cell" style={{ background: cellColor(r.key, d) }} />
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

      <button type="button" className="btn btn-primary" onClick={save} disabled={saved}>
        {saved ? "Gespeichert" : "Eintrag speichern"}
      </button>
    </>
  );
}
