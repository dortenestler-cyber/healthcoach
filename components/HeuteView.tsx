"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clock, isoDay, longDate, startOfToday } from "@/lib/dates";
import { CHECKIN_LEVELS, CHECKIN_QUESTIONS } from "@/lib/catalog";
import PageHead from "@/components/PageHead";

type Checkin = { energy: number | null; sleep: number | null; mood: number | null };
const empty: Checkin = { energy: null, sleep: null, mood: null };

export default function HeuteView() {
  const [checkin, setCheckin] = useState<Checkin>(empty);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [flashes, setFlashes] = useState<Date[]>([]);
  const [error, setError] = useState("");
  const today = isoDay();

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [c, f] = await Promise.all([
      sb.from("checkins").select("energy, sleep, mood").eq("day", today).maybeSingle(),
      sb.from("hot_flashes").select("at").gte("at", startOfToday().toISOString()).order("at", { ascending: false }),
    ]);
    if (c.error || f.error) {
      setError("Daten konnten nicht geladen werden.");
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
    if (e) setError("Check-in konnte nicht gespeichert werden.");
    else setCheckinSaved(true);
  };

  const addFlash = async () => {
    const sb = supabase();
    if (!sb) return;
    const now = new Date();
    setFlashes((list) => [now, ...list]);
    const { error: e } = await sb.from("hot_flashes").insert({ at: now.toISOString(), source: "app" });
    if (e) {
      setFlashes((list) => list.slice(1));
      setError("Hitzewallung konnte nicht gespeichert werden.");
    }
  };

  const signOut = async () => {
    await supabase()?.auth.signOut();
  };

  const complete = CHECKIN_QUESTIONS.every((q) => checkin[q.key] !== null);

  return (
    <>
      <PageHead title="Heute" sub={longDate()} />
      {error && <p className="alert" role="alert">{error}</p>}

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

      <section className="card">
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
      </section>

      <section className="card">
        <h2>Tagesziel und Garmin-Werte</h2>
        <p>Kommt in Phase 2, sobald die Garmin-Daten angebunden sind.</p>
      </section>
      <section className="card">
        <h2>Medikamente und Supplements</h2>
        <p>Kommt in Phase 3.</p>
      </section>

      <button type="button" className="btn btn-link signout" onClick={signOut}>
        Abmelden
      </button>
    </>
  );
}
