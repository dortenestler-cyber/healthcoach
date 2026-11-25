"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";

type Entry = { day: string; bleeding: number; symptoms: Record<string, number> | null; influences: string[] | null };
type Run = { start: string; end: string; days: number };

const STRENGTH: [number, string][] = [
  [2, "leicht"],
  [3, "mittel"],
  [4, "stark"],
];
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const fmt = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Perioden zusammenhängender Blutungstage (Schmierblutung zählt mit), neueste zuerst
export function periodRuns(entries: Entry[]): Run[] {
  const days = entries.filter((e) => e.bleeding > 0).map((e) => e.day).sort();
  const runs: Run[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && addDays(last.end, 1) === d) {
      last.end = d;
      last.days++;
    } else runs.push({ start: d, end: d, days: 1 });
  }
  return runs.reverse();
}

// Vergangene Perioden schnell nachtragen: Startdatum, Dauer, Stärke. Symptome und Einflüsse der Tage bleiben erhalten.
export default function PeriodBackfill({ onChanged }: { onChanged: () => void }) {
  const today = isoDay();
  const [start, setStart] = useState("");
  const [days, setDays] = useState(5);
  const [strength, setStrength] = useState(3);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Run | null>(null); // Periode ändern (Sammelliste Punkt 20)

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error } = await sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(760))).order("day");
    if (error) setMsg("Perioden konnten nicht geladen werden: " + error.message);
    setEntries((data ?? []) as Entry[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;
  const runs = periodRuns(entries);
  const byDay = new Map(entries.map((e) => [e.day, e]));

  // Tage schreiben: Blutung setzen, alles andere vom bestehenden Eintrag übernehmen
  const write = async (list: string[], bleeding: (day: string) => number) => {
    const rows = list.map((day) => {
      const e = byDay.get(day);
      return { day, bleeding: bleeding(day), symptoms: e?.symptoms ?? {}, influences: e?.influences ?? [], updated_at: new Date().toISOString() };
    });
    const { error } = await sb.from("diary_entries").upsert(rows, { onConflict: "user_id,day" });
    return error?.message ?? null;
  };

  const add = async () => {
    if (!start || start > today) {
      setMsg("Bitte ein Startdatum bis heute wählen.");
      return;
    }
    const list = Array.from({ length: days }, (_, i) => addDays(start, i)).filter((d) => d <= today);
    setBusy(true);
    // Beim Ändern: alte Tage, die nicht mehr dazugehören, auf „keine Blutung“ setzen
    const old = editing ? Array.from({ length: editing.days }, (_, i) => addDays(editing.start, i)).filter((d) => !list.includes(d)) : [];
    const e0 = old.length ? await write(old, () => 0) : null;
    const e = e0 ?? (await write(list, () => strength));
    setBusy(false);
    setMsg(e ? "Das hat nicht geklappt: " + e : `Periode ab ${fmt(start)} mit ${list.length} Tagen ${editing ? "geändert" : "eingetragen"}.`);
    if (!e) {
      setEditing(null);
      setStart("");
      await load();
      onChanged();
    }
  };

  const remove = async (r: Run) => {
    if (confirm !== r.start) {
      setConfirm(r.start);
      return;
    }
    const list = Array.from({ length: r.days }, (_, i) => addDays(r.start, i));
    setBusy(true);
    const e = await write(list, () => 0);
    setBusy(false);
    setConfirm(null);
    setMsg(e ? "Das hat nicht geklappt: " + e : `Periode ab ${fmt(r.start)} entfernt. Symptome und Einflüsse dieser Tage sind geblieben.`);
    await load();
    onChanged();
  };

  return (
    <section className="card" id="perioden">
      <h2>{editing ? `Periode ab ${fmt(editing.start)} ändern` : "Vergangene Perioden nachtragen"}</h2>
      {!editing && (
        <Link href="/kalender?von=zyklus" className="settings-link">
          Schneller im Kalender: lange auf den ersten Tag drücken, letzten Tag tippen ›
        </Link>
      )}
      <label className="field">
        <span className="meta">Erster Tag</span>
        <input type="date" className="input" max={today} value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <div className="card-row">
        <span className="row-label">Dauer</span>
        <div className="counter">
          <button type="button" className="btn btn-soft btn-44" aria-label="Einen Tag weniger" disabled={days <= 1} onClick={() => setDays(days - 1)}>−</button>
          <span className="row-strong counter-value">{days} Tage</span>
          <button type="button" className="btn btn-soft btn-44" aria-label="Einen Tag mehr" disabled={days >= 12} onClick={() => setDays(days + 1)}>+</button>
        </div>
      </div>
      <div className="card-row">
        <span className="row-label">Stärke</span>
        <div className="pills">
          {STRENGTH.map(([v, l]) => (
            <button key={v} type="button" className="pill btn-44" aria-pressed={strength === v} onClick={() => setStrength(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn btn-dark btn-44" disabled={busy || !start} onClick={add}>
        {editing ? "Änderung speichern" : "Periode eintragen"}
      </button>
      {editing && (
        <button type="button" className="btn btn-soft btn-44" onClick={() => { setEditing(null); setStart(""); setDays(5); }}>
          Abbrechen
        </button>
      )}
      {msg && <span className="meta" role="status">{msg}</span>}

      {runs.length > 0 && (
        <>
          <span className="meta">Eingetragene Perioden · letzte 2 Jahre</span>
          {runs.slice(0, 24).map((r, i) => {
            const next = runs[i - 1];
            const gap = next ? Math.round((new Date(next.start).getTime() - new Date(r.start).getTime()) / 864e5) : null;
            return (
              <div key={r.start} className="card-row list-line">
                <div className="stack">
                  <span className="row-label">ab {fmt(r.start)}</span>
                  <span className="meta">{r.days} {r.days === 1 ? "Tag" : "Tage"}{gap !== null ? ` · Zyklus ${gap} Tage` : " · laufender Zyklus"}</span>
                </div>
                <span className="footer-links">
                  <button
                    type="button"
                    className="btn btn-link btn-44"
                    disabled={busy}
                    onClick={() => {
                      setEditing(r);
                      setStart(r.start);
                      setDays(r.days);
                      const b = byDay.get(r.start)?.bleeding ?? 3;
                      setStrength(STRENGTH.some(([v]) => v === b) ? b : 3);
                      document.getElementById("perioden")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Ändern
                  </button>
                  <button type="button" className={confirm === r.start ? "btn btn-soft btn-44 meta-warn" : "btn btn-link btn-44"} disabled={busy} onClick={() => remove(r)}>
                    {confirm === r.start ? "Wirklich entfernen?" : "Entfernen"}
                  </button>
                </span>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
