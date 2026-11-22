"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CHECKIN_LEVELS, CHECKIN_QUESTIONS } from "@/lib/catalog";

type Checkin = { energy: number | null; sleep: number | null; mood: number | null };
const empty: Checkin = { energy: null, sleep: null, mood: null };

// Check-in eines Tages: Energie, Schlafgefühl, Stimmung. Heute „Morgen-Check-in“, an vergangenen Tagen zum Nachtragen.
// Speichert mit eigenem Knopf, unabhängig vom Tagebuch-Eintrag.
export default function CheckinCard({ day, isToday }: { day: string; isToday: boolean }) {
  const [checkin, setCheckin] = useState<Checkin>(empty);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("checkins").select("energy, sleep, mood").eq("day", day).maybeSingle();
    if (e) {
      setError("Check-in konnte nicht geladen werden: " + e.message);
      return;
    }
    setCheckin(data ? { energy: data.energy, sleep: data.sleep, mood: data.mood } : empty);
    setSaved(!!data);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    const { error: e } = await sb.from("checkins").upsert({ day, ...checkin, source: "app" }, { onConflict: "user_id,day" });
    if (e) setError("Check-in konnte nicht gespeichert werden: " + e.message);
    else {
      setError("");
      setSaved(true);
    }
  };

  const complete = CHECKIN_QUESTIONS.every((q) => checkin[q.key] !== null);

  return (
    <section className="card">
      <div className="card-row">
        <h2>{isToday ? "Morgen-Check-in" : "Check-in"}</h2>
        <span className="meta">{saved ? "Gespeichert" : "30 Sekunden"}</span>
      </div>
      {error && <p className="alert alert-inline">{error}</p>}
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
                  setSaved(false);
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!saved && (
        <button type="button" className="btn btn-dark" disabled={!complete} onClick={save}>
          Check-in speichern
        </button>
      )}
    </section>
  );
}
