"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/dates";
import { MUSCLE_DURATIONS, MUSCLE_LEVELS, MUSCLE_SIDES, MUSCLE_SITUATIONS, MUSCLE_SPOTS } from "@/lib/catalog";

export type MuscleEvent = {
  id: string;
  at: string;
  day: string;
  intensity: number;
  side: string;
  spot: string;
  situation: string;
  duration: string | null;
  swelling: boolean;
  numbness: boolean;
};

const COLS = "id, at, day, intensity, side, spot, situation, duration, swelling, numbness";
const NIGHT_END = 4; // bis 4 Uhr zählt ein Eintrag noch zum Abend davor

const label = (list: { key: string; label: string }[], key: string | null) => list.find((x) => x.key === key)?.label ?? "";
const levelLabel = (v: number) => MUSCLE_LEVELS.find((l) => l.value === v)?.label ?? "";
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDay(d);
};

// Wadenzucken und Wadenkrämpfe eines Tages: ein Tipp speichert sofort, Einzelheiten danach änderbar.
// Meist abends. Heute nach Mitternacht (bis 4 Uhr) zählt der Eintrag zum Abend von gestern.
export default function MuscleSection({ day, onChanged }: { day: string; onChanged?: () => void }) {
  const [rows, setRows] = useState<MuscleEvent[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("muscle_events").select(COLS).eq("day", day).order("at");
    if (e) {
      setError(/muscle_events/.test(e.message) ? "Die Tabelle für Wadenkrämpfe fehlt noch in der Datenbank. Sie wird nach dem Merge automatisch angelegt." : "Einträge konnten nicht geladen werden: " + e.message);
      return;
    }
    setError("");
    setRows((data ?? []) as MuscleEvent[]);
  }, [day]);

  useEffect(() => {
    load();
    setOpen(null);
    setNote("");
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const changed = () => {
    load();
    onChanged?.();
  };

  const add = async (intensity: number) => {
    const now = new Date();
    const isToday = day === isoDay();
    const afterMidnight = isToday && now.getHours() < NIGHT_END;
    let at = now.toISOString();
    if (!isToday) {
      const d = new Date(day + "T00:00:00");
      d.setHours(21, 0, 0, 0);
      at = d.toISOString();
    }
    const evening = !isToday || afterMidnight || now.getHours() >= 17;
    const row = { at, day: afterMidnight ? yesterday() : day, intensity, situation: evening ? "abends" : "tagsueber", source: "app" };
    const { data, error: e } = await sb.from("muscle_events").insert(row).select("id").single();
    if (e) {
      setError("Das hat nicht geklappt: " + e.message);
      return;
    }
    setError("");
    setNote(afterMidnight ? "Gespeichert für den Abend von gestern, weil es nach Mitternacht ist." : "");
    if (!afterMidnight && data) setOpen((data as { id: string }).id);
    changed();
  };

  const update = async (id: string, patch: Partial<MuscleEvent>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error: e } = await sb.from("muscle_events").update(patch).eq("id", id);
    if (e) setError("Das hat nicht geklappt: " + e.message);
    changed();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Diesen Eintrag löschen?")) return;
    const { error: e } = await sb.from("muscle_events").delete().eq("id", id);
    if (e) setError("Das hat nicht geklappt: " + e.message);
    setOpen(null);
    changed();
  };

  const warn = rows.some((r) => r.swelling || r.numbness);
  const time = (at: string) => new Date(at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const choice = (r: MuscleEvent, field: "side" | "spot" | "situation" | "duration", list: { key: string; label: string }[], title: string) => (
    <div className="field">
      <span className="label">{title}</span>
      <div className="pills wrap">
        {list.map((o) => (
          <button
            key={o.key}
            type="button"
            className="pill btn-44"
            aria-pressed={r[field] === o.key}
            onClick={() => update(r.id, { [field]: field === "duration" && r.duration === o.key ? null : o.key })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card">
      <div className="card-row">
        <h2>Wadenzucken und Krämpfe</h2>
        <span className="meta">{rows.length ? `${rows.length} an diesem Tag` : "Tippen speichert sofort"}</span>
      </div>
      <div className="pills wrap">
        {MUSCLE_LEVELS.map((l) => (
          <button key={l.value} type="button" className={"pill btn-44 level-" + l.value} onClick={() => add(l.value)}>
            + {l.label}
          </button>
        ))}
      </div>
      {note && <p className="meta">{note}</p>}
      {error && <p className="alert alert-inline">{error}</p>}

      {rows.map((r) => (
        <div key={r.id} className="list-line">
          <div className="card-row">
            <div className="stack">
              <span className="row-label">
                {levelLabel(r.intensity)} · {label(MUSCLE_SPOTS, r.spot)} {label(MUSCLE_SIDES, r.side)}
              </span>
              <span className="meta">
                {label(MUSCLE_SITUATIONS, r.situation)}
                {r.duration ? " · " + label(MUSCLE_DURATIONS, r.duration) : ""} · {time(r.at)}
              </span>
            </div>
            <button type="button" className="btn btn-link btn-44" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
              {open === r.id ? "Fertig" : "Ändern"}
            </button>
          </div>
          {open === r.id && (
            <div className="form">
              <div className="field">
                <span className="label">Intensität</span>
                <div className="pills wrap">
                  {MUSCLE_LEVELS.map((l) => (
                    <button key={l.value} type="button" className="pill btn-44" aria-pressed={r.intensity === l.value} onClick={() => update(r.id, { intensity: l.value })}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              {choice(r, "side", MUSCLE_SIDES, "Seite")}
              {choice(r, "spot", MUSCLE_SPOTS, "Stelle")}
              {choice(r, "situation", MUSCLE_SITUATIONS, "Wann")}
              {choice(r, "duration", MUSCLE_DURATIONS, "Wie lange (freiwillig)")}
              <div className="field">
                <span className="label">Ist dir dabei etwas aufgefallen?</span>
                <div className="pills wrap">
                  <button type="button" className="pill btn-44" aria-pressed={r.swelling} onClick={() => update(r.id, { swelling: !r.swelling })}>
                    Schwellung, Rötung oder Wärme
                  </button>
                  <button type="button" className="pill btn-44" aria-pressed={r.numbness} onClick={() => update(r.id, { numbness: !r.numbness })}>
                    Schwäche oder Taubheit
                  </button>
                </div>
              </div>
              <button type="button" className="btn btn-quiet btn-44" onClick={() => remove(r.id)}>
                Eintrag löschen
              </button>
            </div>
          )}
        </div>
      ))}

      {warn && (
        <p className="alert alert-inline" role="alert">
          Eine geschwollene, gerötete oder warme Wade sowie Schwäche oder Taubheit im Bein bitte zeitnah ärztlich abklären lassen. Bei plötzlicher Atemnot oder Brustschmerz: Notruf 112.
        </p>
      )}
    </section>
  );
}
