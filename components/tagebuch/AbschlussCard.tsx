"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CHECKIN_LEVELS } from "@/lib/catalog";
import { loadInsightData } from "@/lib/insightData";
import { computeTarget, dayLoad, type Data } from "@/lib/insights";
import { hm, sleepNeed } from "@/lib/today";

// Tagesabschluss (freigegeben 25.11.): Belastung gegen das Ziel, Schlafbedarf mit „ins Bett bis“,
// Check-out (Energie und Stimmung am Abend, 5 Stufen, checkins.energy_evening / mood_evening), ein Wort zum Tag (diary_entries.note). Gewohnheiten, Symptome und Einnahmen stehen darunter im Tagebuch.
export default function AbschlussCard({ day }: { day: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [word, setWord] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<"" | "speichert" | "gespeichert">("");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<{ energy_evening: number | null; mood_evening: number | null }>({ energy_evening: null, mood_evening: null });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadInsightData(60).then(setData).catch(() => setData(null));
    supabase()
      ?.from("checkins")
      .select("energy_evening, mood_evening")
      .eq("day", day)
      .maybeSingle()
      .then(({ data: c }) => setOut({ energy_evening: c?.energy_evening ?? null, mood_evening: c?.mood_evening ?? null }));
    supabase()
      ?.from("diary_entries")
      .select("note")
      .eq("day", day)
      .maybeSingle()
      .then(({ data: d }) => {
        const n = ((d as { note?: string | null } | null)?.note ?? "").trim();
        setWord(n);
        setSaved(n);
      });
  }, [day]);

  const save = async (v: string) => {
    const sb = supabase();
    if (!sb || v === saved) return;
    setStatus("speichert");
    const { error } = await sb.from("diary_entries").upsert({ day, note: v || null, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (error) {
      setMsg("Nicht gespeichert: " + error.message);
      setStatus("");
      return;
    }
    setMsg("");
    setSaved(v);
    setStatus("gespeichert");
  };
  // Check-out: jede Antwort wird sofort gespeichert
  const answer = async (key: "energy_evening" | "mood_evening", value: number) => {
    const sb = supabase();
    if (!sb) return;
    const before = out;
    setOut({ ...out, [key]: value });
    const { error } = await sb.from("checkins").upsert({ day, [key]: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (error) {
      setOut(before);
      setMsg("Check-out nicht gespeichert: " + error.message);
    } else setMsg("");
  };
  const change = (v: string) => {
    setWord(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v.trim()), 800);
  };

  const dl = data ? dayLoad(day, data.daily, data.acts) : null;
  const t = data ? computeTarget(day, data) : null;
  const need = data ? sleepNeed(day, data.daily, data.acts) : null;
  // Ins Bett bis: übliche Aufwachzeit der letzten 14 Nächte minus Bedarf
  const wakes = data ? data.daily.filter((r) => r.day > shift(day, -14) && r.day <= day && typeof r.sleep_end_min === "number").map((r) => r.sleep_end_min as number) : [];
  const wake = median(wakes);
  const bed = need && wake !== null ? clock(wake + 1440 - need.hours * 60) : null;

  const sentence = !dl || !t ? "Dein Tag in Kürze." : t.pause ? `Belastung ${dl.pct} %, heute Pause.` : dl.pct < t.lo ? `Belastung ${dl.pct} %, Ziel ${t.lo}–${t.hi} %: noch Luft.` : dl.pct > t.hi ? `Belastung ${dl.pct} %, über dem Ziel ${t.lo}–${t.hi} %.` : `Belastung ${dl.pct} %, im Ziel ${t.lo}–${t.hi} %.`;

  return (
    <section className="card abschluss-card" id="abschluss">
      <span className="eyebrow">Tagesabschluss</span>
      <h2 className="card-title-lg unit-sentence">{sentence}</h2>
      {need && (
        <div className="unit-tiles">
          <div className="unit-tile">
            <span className="meta">Schlafbedarf</span>
            <span className="unit-tile-value">{hm(need.hours)}</span>
          </div>
          <div className="unit-tile">
            <span className="meta">Ins Bett bis</span>
            <span className="unit-tile-value">{bed ?? "–"}</span>
          </div>
        </div>
      )}
      <h3 className="row-strong">Check-out</h3>
      {([["energy_evening", "Energie"], ["mood_evening", "Stimmung"]] as const).map(([key, label]) => (
        <div key={key} className="card-row">
          <span className="row-label">{label}</span>
          <div className="pills">
            {CHECKIN_LEVELS.map((l, i) => (
              <button key={l} type="button" className="pill pill-sm" aria-pressed={out[key] === i + 1} onClick={() => answer(key, i + 1)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ))}
      <label htmlFor="tag-wort" className="row-label">Ein Wort zum Tag</label>
      <input id="tag-wort" className="input" value={word} maxLength={40} placeholder="z. B. ruhig, voll, gut" onChange={(e) => change(e.target.value)} onBlur={() => save(word.trim())} />
      <span className="meta" role="status" aria-live="polite">{status === "speichert" ? "Speichert …" : status === "gespeichert" ? "✓ Gespeichert" : ""}</span>
      {msg && <p className="meta-warn" role="alert">{msg}</p>}
    </section>
  );
}

function shift(day: string, n: number): string {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function median(a: number[]): number | null {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
}
function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
