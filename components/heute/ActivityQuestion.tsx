"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { durationText, loadActivityOverrides, type Activity } from "@/lib/garmin";
import { sportOfGarmin, SPORTS, type Sport } from "@/lib/training";
import { tipDate } from "@/components/charts/pick";
import { useCoachPrefs } from "@/lib/prefs";

const CHOICES: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];

// Sammelliste Punkt 6: Landet eine Garmin-Aktivität bei „Sonstiges“, fragt der Coach, was es war.
// Keine Anfrage an Claude. Erscheint erst, wenn die Spalte sport_override da ist (Migration Daten).
export default function ActivityQuestion({ acts, onSaved }: { acts: Activity[]; onSaved: () => void }) {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [own, setOwn] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const coach = useCoachPrefs();

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadActivityOverrides(sb, isoDay(daysAgo(13))).then((ov) => {
      setReady(ov !== null);
      if (ov) setDone(new Set(ov.keys()));
    });
  }, []);

  const from = isoDay(daysAgo(13));
  const open = acts
    .filter((a) => a.start_local && a.start_local.slice(0, 10) >= from && !a.sport_override && !done.has(a.activity_id) && sportOfGarmin(a.type_key) === "sonstiges")
    .sort((a, b) => (b.start_local as string).localeCompare(a.start_local as string));
  const a = open[0];
  if (!ready || !a) return null;

  const save = async (sport: string, label: string | null) => {
    const sb = supabase();
    if (!sb || busy) return;
    setBusy(true);
    const { error: e } = await sb.from("garmin_activities").update({ sport_override: sport, sport_label: label }).eq("activity_id", a.activity_id);
    setBusy(false);
    if (e) {
      setError("Das hat nicht geklappt: " + e.message);
      return;
    }
    setError("");
    setOwn(false);
    setName("");
    setDone(new Set([...done, a.activity_id]));
    onSaved();
  };

  const facts = [tipDate((a.start_local as string).slice(0, 10)), durationText(a.duration_s), a.avg_hr ? `Puls Ø ${Math.round(a.avg_hr)}` : ""].filter(Boolean).join(", ");

  return (
    <section className="card act-question" aria-label="Frage zu einer Garmin-Aktivität">
      <div className="act-q-head">
        {coach.on && (
          <span className="coach-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
              <path d="M4 5h16v11H9l-5 4zM7 10.5h2.5l1.5-2.5 2 5 1.5-2.5H17" />
            </svg>
          </span>
        )}
        <p className="act-q-text">Was war das am {facts}?{open.length > 1 ? ` (noch ${open.length - 1} weitere)` : ""}</p>
      </div>
      {error && <p className="alert alert-inline">{error}</p>}
      {own ? (
        <form className="act-q-own" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save("sonstiges", name.trim().slice(0, 40)); }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Yoga, Tanzen" aria-label="Eigener Name" autoFocus maxLength={40} />
          <button type="submit" className="btn btn-primary btn-44" disabled={busy || !name.trim()}>Speichern</button>
        </form>
      ) : (
        <div className="pills wrap">
          {CHOICES.map((s) => (
            <button key={s} type="button" className="pill" disabled={busy} onClick={() => save(s, null)}>
              {SPORTS[s].label}
            </button>
          ))}
          <button type="button" className="pill" disabled={busy} onClick={() => setOwn(true)}>Anderes …</button>
          <button type="button" className="pill pill-quiet" disabled={busy} onClick={() => save("ignorieren", null)}>Nicht zuordnen</button>
        </div>
      )}
    </section>
  );
}
