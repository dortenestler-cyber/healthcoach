"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ILLNESSES } from "@/lib/health";
import { loadHabits, type Habit } from "@/lib/habits";
import type { Data } from "@/lib/insights";
import EditSheet from "@/components/ui/EditSheet";

// Mehrere Tage im zentralen Kalender (Konzept docs/konzept-einfach.md, Paket 6, Logbuch 25.11.):
// Periode eintragen · Krank von–bis · Gewohnheit für diese Tage · Vergleichen.
// Schreibt in dieselben Tabellen wie Tagebuch und Gesundheit, ohne andere Felder der Tage zu ändern.

type Aktion = "periode" | "krank" | "gewohnheit" | "vergleich";

const MONATE = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const kurz = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONATE[Number(iso.slice(5, 7)) - 1]}`;
const plus = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function tageVon(von: string, bis: string): string[] {
  const out: string[] = [];
  for (let d = von; d <= bis; d = plus(d, 1)) out.push(d);
  return out;
}
export const zeitraumText = (von: string, bis: string) => (von === bis ? kurz(von) : `${kurz(von)} – ${kurz(bis)}`);

const STAERKE: [number, string][] = [
  [2, "leicht"],
  [3, "mittel"],
  [4, "stark"],
];

// Werte zum Vergleichen: Schnitt im Zeitraum gegen die 30 Tage davor
const WERTE: { key: string; label: string; get: (d: Data["daily"][number]) => number | null; fmt: (v: number) => string }[] = [
  { key: "hrv", label: "HRV", get: (d) => d.hrv_last_night, fmt: (v) => `${Math.round(v)} ms` },
  { key: "ruhepuls", label: "Ruhepuls", get: (d) => d.resting_hr, fmt: (v) => `${Math.round(v)} bpm` },
  { key: "schlaf", label: "Schlaf", get: (d) => (d.sleep_seconds ? d.sleep_seconds / 3600 : null), fmt: (v) => `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, "0")}` },
  { key: "stress", label: "Stress", get: (d) => d.stress_avg, fmt: (v) => String(Math.round(v)) },
  { key: "schritte", label: "Schritte", get: (d) => d.steps, fmt: (v) => Math.round(v).toLocaleString("de-DE") },
];

function schnitt(werte: (number | null)[]): number | null {
  const v = werte.filter((x): x is number => x !== null && x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export default function ZeitraumLeiste({ von, bis, today, data, onDone, onCancel }: { von: string; bis: string; today: string; data: Data | null; onDone: () => void; onCancel: () => void }) {
  const [aktion, setAktion] = useState<Aktion | null>(null);
  const [staerke, setStaerke] = useState(3);
  const [krank, setKrank] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habit, setHabit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const tage = tageVon(von, bis);
  const bisHeute = tage.filter((d) => d <= today);

  useEffect(() => {
    const sb = supabase();
    if (sb && aktion === "gewohnheit" && !habits.length) loadHabits(sb).then((h) => setHabits(h.filter((x) => x.on)));
  }, [aktion, habits.length]);

  const schliessen = () => {
    setAktion(null);
    setError("");
  };

  const fertig = (text: string) => {
    setBusy(false);
    setAktion(null);
    setMsg(text);
    onDone();
  };

  const speichern = async () => {
    const sb = supabase();
    if (!sb || !aktion) return;
    setBusy(true);
    setError("");
    const jetzt = new Date().toISOString();
    if (aktion === "periode") {
      if (!bisHeute.length) {
        setBusy(false);
        setError("Eine Periode lässt sich nur bis heute eintragen.");
        return;
      }
      // Nur die Blutung setzen; Symptome und Gewohnheiten der Tage bleiben
      const { error: e } = await sb.from("diary_entries").upsert(bisHeute.map((day) => ({ day, bleeding: staerke, updated_at: jetzt })), { onConflict: "user_id,day" });
      if (e) return (setBusy(false), setError("Das hat nicht geklappt: " + e.message));
      return fertig(`Periode ${zeitraumText(bisHeute[0], bisHeute[bisHeute.length - 1])} eingetragen (${bisHeute.length} ${bisHeute.length === 1 ? "Tag" : "Tage"}).`);
    }
    if (aktion === "krank") {
      const k = ILLNESSES.find((i) => i.key === krank);
      if (!k) return (setBusy(false), setError("Bitte wähle aus, was du hattest."));
      if (von > today) return (setBusy(false), setError("Krankheiten lassen sich nur bis heute eintragen."));
      // Reicht der Zeitraum bis heute, gilt die Krankheit als noch nicht vorbei
      const { error: e } = await sb.from("illnesses").insert({ kind: k.key, label: k.label, started_on: von, ended_on: bis < today ? bis : null, severity: 2, fever: !!k.fever, below_neck: !!k.below });
      if (e) return (setBusy(false), setError("Das hat nicht geklappt: " + e.message));
      return fertig(`${k.label} ${bis < today ? zeitraumText(von, bis) : `seit ${kurz(von)}`} eingetragen.`);
    }
    if (aktion === "gewohnheit") {
      const h = habits.find((x) => x.key === habit);
      if (!h) return (setBusy(false), setError("Bitte wähle eine Gewohnheit."));
      if (!bisHeute.length) return (setBusy(false), setError("Gewohnheiten lassen sich nur bis heute eintragen."));
      const { data: rows, error: e1 } = await sb.from("diary_entries").select("day, influences").gte("day", bisHeute[0]).lte("day", bisHeute[bisHeute.length - 1]);
      if (e1) return (setBusy(false), setError("Das hat nicht geklappt: " + e1.message));
      const alt = new Map(((rows ?? []) as { day: string; influences: string[] | null }[]).map((r) => [r.day, r.influences ?? []]));
      const neu = bisHeute.map((day) => ({ day, influences: [...new Set([...(alt.get(day) ?? []), h.key])], updated_at: jetzt }));
      const { error: e2 } = await sb.from("diary_entries").upsert(neu, { onConflict: "user_id,day" });
      if (e2) return (setBusy(false), setError("Das hat nicht geklappt: " + e2.message));
      return fertig(`${h.label} an ${bisHeute.length} ${bisHeute.length === 1 ? "Tag" : "Tagen"} eingetragen.`);
    }
  };

  // Vergleich: nur Tage bis heute, gegen die 30 Tage vor dem Zeitraum
  const vergleich = (() => {
    if (!data) return [];
    const drin = data.daily.filter((d) => d.day >= von && d.day <= bis && d.day <= today);
    const davor = data.daily.filter((d) => d.day >= plus(von, -30) && d.day < von);
    return WERTE.map((w) => {
      const a = schnitt(drin.map(w.get));
      const b = schnitt(davor.map(w.get));
      const diff = a !== null && b ? (a - b) / b : null;
      const wort = diff === null ? "" : Math.abs(diff) < 0.05 ? "etwa wie sonst" : diff > 0 ? "höher als sonst" : "niedriger als sonst";
      return { ...w, a, b, wort };
    }).filter((r) => r.a !== null);
  })();

  return (
    <>
      <section className="card zeitraum-leiste" aria-label="Mehrere Tage gewählt">
        <div className="card-row">
          <span className="row-strong">
            {zeitraumText(von, bis)} · {tage.length} {tage.length === 1 ? "Tag" : "Tage"}
          </span>
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Fertig
          </button>
        </div>
        {msg && <p className="meta zeitraum-ok" role="status">✓ {msg}</p>}
        <div className="zeitraum-aktionen">
          <button type="button" className="pill" onClick={() => setAktion("periode")}>Periode eintragen</button>
          <button type="button" className="pill" onClick={() => setAktion("krank")}>Krank von–bis</button>
          <button type="button" className="pill" onClick={() => setAktion("gewohnheit")}>Gewohnheit</button>
          <button type="button" className="pill" onClick={() => setAktion("vergleich")}>Vergleichen</button>
        </div>
      </section>

      <EditSheet title={`Periode · ${zeitraumText(von, bis)}`} open={aktion === "periode"} onClose={schliessen} onSave={speichern} saving={busy} error={error} saveLabel="Eintragen">
        <span className="row-strong">Stärke</span>
        <div className="pills wrap">
          {STAERKE.map(([v, l]) => (
            <button key={v} type="button" className="pill" aria-pressed={staerke === v} onClick={() => setStaerke(v)}>{l}</button>
          ))}
        </div>
      </EditSheet>

      <EditSheet title={`Krank · ${bis < today ? zeitraumText(von, bis) : `seit ${kurz(von)}`}`} open={aktion === "krank"} onClose={schliessen} onSave={speichern} saving={busy} error={error} saveLabel="Eintragen" canSave={!!krank}>
        <div className="pills wrap">
          {ILLNESSES.map((i) => (
            <button key={i.key} type="button" className="pill" aria-pressed={krank === i.key} onClick={() => setKrank(i.key)}>{i.label}</button>
          ))}
        </div>
      </EditSheet>

      <EditSheet title={`Gewohnheit · ${zeitraumText(von, bis)}`} open={aktion === "gewohnheit"} onClose={schliessen} onSave={speichern} saving={busy} error={error} saveLabel="Eintragen" canSave={!!habit}>
        <div className="pills wrap">
          {habits.map((h) => (
            <button key={h.key} type="button" className="pill" aria-pressed={habit === h.key} onClick={() => setHabit(h.key)}>{h.label}</button>
          ))}
        </div>
      </EditSheet>

      <EditSheet title={`Vergleichen · ${zeitraumText(von, bis)}`} open={aktion === "vergleich"} onClose={schliessen} instant>
        {vergleich.length === 0 && <p>Für diese Tage gibt es noch keine Werte von Garmin.</p>}
        {vergleich.map((r) => (
          <div key={r.key} className="card-row list-line">
            <div className="stack">
              <span className="row-strong">{r.label}</span>
              <span className="meta">{r.b !== null ? `sonst ${r.fmt(r.b)} · ${r.wort}` : "ohne Vergleich"}</span>
            </div>
            <span className="range-row-value">{r.fmt(r.a as number)}</span>
          </div>
        ))}
      </EditSheet>
    </>
  );
}
