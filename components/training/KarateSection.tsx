"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate } from "@/lib/dates";
import { SPOTS, weekStart, type Injury } from "@/lib/health";
import { fromIso, loadSettings, saveSettings, sportOfGarmin, type Settings } from "@/lib/training";

type Item = { id: string; label: string; category: string; done: boolean };
const CATEGORIES = ["Kihon", "Kata", "Kumite", "Sonstiges"];

// Karate: Prüfung zum 5. Kyu, Trainings pro Woche, eigene Prüfungsliste
export default function KarateSection() {
  const [settings, setSettings] = useState<Settings>({});
  const [items, setItems] = useState<Item[]>([]);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Kihon");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(weekStart(daysAgo(7 * 7)));
    const [s, it, p, a, inj] = await Promise.all([
      loadSettings(sb),
      sb.from("karate_items").select("id, label, category, done").order("created_at"),
      sb.from("planned_sessions").select("day").eq("sport", "karate").eq("status", "erledigt").gte("day", from),
      sb.from("garmin_activities").select("type_key, start_local").gte("start_local", from),
      sb.from("injuries").select("*").is("ended_on", null),
    ]);
    setSettings(s);
    if (it.error) setError("Liste konnte nicht geladen werden: " + it.error.message);
    setItems((it.data ?? []) as Item[]);
    setInjuries((inj.data ?? []) as Injury[]);
    const days = new Set<string>(((p.data ?? []) as { day: string }[]).map((r) => r.day));
    for (const r of (a.data ?? []) as { type_key: string | null; start_local: string | null }[]) {
      if (sportOfGarmin(r.type_key) === "karate" && r.start_local) days.add(r.start_local.slice(0, 10));
    }
    const now = weekStart(new Date()).getTime();
    const counts = Array.from({ length: 8 }, () => 0);
    for (const d of days) {
      const w = Math.round((now - weekStart(fromIso(d)).getTime()) / (7 * 864e5));
      if (w >= 0 && w < 8) counts[7 - w] += 1;
    }
    setWeeks(counts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: e } = await p;
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };

  const setExam = async (v: string) => {
    const next = { ...settings, examDate: v || undefined };
    setSettings(next);
    const { error: e } = await saveSettings(sb, next);
    if (e) setError("Datum konnte nicht gespeichert werden: " + e.message);
  };

  const exam = settings.examDate;
  const weeksLeft = exam ? Math.ceil((fromIso(exam).getTime() - fromIso(isoDay()).getTime()) / (7 * 864e5)) : null;
  const done = items.filter((i) => i.done).length;
  const total = weeks.reduce((a, b) => a + b, 0);

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <div className="stack">
            <span className="meta">Prüfung zum 5. Kyu</span>
            <span className="big-number">{exam ? (weeksLeft !== null && weeksLeft >= 0 ? `noch ${weeksLeft} Wochen` : "vorbei") : "Frühjahr 2027"}</span>
            <span className="meta">{exam ? longDate(fromIso(exam)) : "Trag das Datum ein, sobald es feststeht."}</span>
          </div>
        </div>
        <label className="label" htmlFor="exam">Prüfungsdatum</label>
        <input id="exam" type="date" className="input" value={exam ?? ""} min={isoDay()} onChange={(e) => setExam(e.target.value)} />
      </section>

      <section className="card">
        <div className="card-row">
          <h2>Trainings pro Woche</h2>
          <span className="meta">{total} in 8 Wochen</span>
        </div>
        <div className="bars small" role="img" aria-label={`Karate-Trainings der letzten 8 Wochen, insgesamt ${total}`}>
          {weeks.map((c, i) => (
            <div key={i} className="bar-col">
              <span className="bar-val">{c || ""}</span>
              <span className="bar" style={{ height: Math.max(3, c * 18) + "px", background: i === 7 ? "var(--accent)" : "#cfcdc8" }} />
            </div>
          ))}
        </div>
        <span className="meta">Erledigte Einheiten aus dem Kalender und Karate aus Garmin.</span>
      </section>

      {injuries.map((inj) =>
        SPOTS[inj.spot] ? (
          <p key={inj.id} className="kyu">
            {SPOTS[inj.spot].label} verletzt. {SPOTS[inj.spot].kyu}
          </p>
        ) : null
      )}

      <section className="card">
        <div className="card-row">
          <h2>Meine Prüfungsliste</h2>
          <span className="meta">{items.length ? `${done} von ${items.length} sicher` : ""}</span>
        </div>
        {!items.length && <p>Trag hier ein, was dein Dojo für den 5. Kyu verlangt, zum Beispiel einzelne Techniken, die Kata oder Kumite-Formen. Dann hakst du ab, was schon sitzt.</p>}
        {CATEGORIES.map((c) => {
          const list = items.filter((i) => i.category === c);
          if (!list.length) return null;
          return (
            <div key={c} className="stack">
              <span className="eyebrow">{c}</span>
              {list.map((i) => (
                <div key={i.id} className="card-row list-line">
                  <button type="button" className="check" aria-pressed={i.done} onClick={() => run(sb.from("karate_items").update({ done: !i.done }).eq("id", i.id))}>
                    <span className="check-box">{i.done ? "✓" : ""}</span>
                    <span>{i.label}</span>
                  </button>
                  <button type="button" className="btn btn-link" aria-label={`${i.label} löschen`} onClick={() => run(sb.from("karate_items").delete().eq("id", i.id))}>×</button>
                </div>
              ))}
            </div>
          );
        })}
        <div className="pills wrap">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="pill pill-sm" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="inline-form">
          <input className="input" placeholder="Neuer Punkt" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Neuer Punkt für die Prüfungsliste" />
          <button
            type="button"
            className="btn btn-quiet"
            disabled={!label.trim()}
            onClick={() => {
              run(sb.from("karate_items").insert({ label: label.trim(), category }));
              setLabel("");
            }}
          >
            Hinzufügen
          </button>
        </div>
      </section>
    </>
  );
}
