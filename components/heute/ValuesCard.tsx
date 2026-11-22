"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RangeRow } from "@/components/charts";
import HrvCard from "@/components/heute/HrvCard";
import SleepCard from "@/components/heute/SleepCard";
import StressCard from "@/components/heute/StressCard";
import { countInRange, RANGE_PHASE_NAMES } from "@/lib/baseline";
import { clock, isoDay } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { syncGarmin } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { offStreaks, vitalRows } from "@/lib/today";

const AUTO_SYNC_AFTER_MS = 2 * 60 * 60 * 1000;

type View = "werte" | "schlaf" | "hrv" | "stress";
const VIEWS: [View, string][] = [
  ["werte", "Übersicht"],
  ["schlaf", "Schlaf"],
  ["hrv", "HRV"],
  ["stress", "Stress"],
];

// „Deine Werte“: Vitalwerte der letzten Nacht mit deinem Bereich, dazu Schlaf, HRV und Stress als Ansichten in einer Karte.
// Garmin synchronisieren (automatisch nach 2 Stunden).
export default function ValuesCard({ day, data, showPhases, onSynced }: { day: string; data: Data | null; showPhases: boolean; onSynced: () => void }) {
  const [view, setView] = useState<View>("werte");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [morning, setMorning] = useState<{ at: string; ok: boolean; message: string | null } | null>(null);
  const autoDone = useRef(false);

  // Letzter automatischer Abruf am Morgen (fehlt die Tabelle noch, bleibt es still)
  useEffect(() => {
    supabase()
      ?.from("garmin_sync_runs")
      .select("at, ok, message")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: run, error: e }) => setMorning(!e && run && isoDay(new Date(run.at)) === isoDay() ? run : null));
  }, [data]);

  const sync = useCallback(
    async (days: number) => {
      setBusy(true);
      setError("");
      const res = await syncGarmin(days);
      setBusy(false);
      if (!res.ok) {
        setError("Synchronisieren hat nicht geklappt: " + res.error);
        return;
      }
      const parts: string[] = [];
      if (typeof res.skinTempNights === "number") parts.push(`Hauttemperatur: ${res.skinTempNights} ${res.skinTempNights === 1 ? "Nacht" : "Nächte"} gefunden.` + (res.skinNote ? " " + res.skinNote : ""));
      if (res.sleepStagesNote) parts.push(res.sleepStagesNote);
      if (res.energyNote) parts.push(res.energyNote);
      if (res.stressNote) parts.push(res.stressNote);
      setNote(parts.join(" "));
      onSynced();
    },
    [onSynced],
  );

  const lastSync = data ? data.daily.reduce((t, r) => Math.max(t, new Date(r.synced_at).getTime()), 0) : 0;

  useEffect(() => {
    if (!data || autoDone.current) return;
    autoDone.current = true;
    if (!data.daily.length) sync(90); // erster Abruf: 90 Tage
    else if (Date.now() - lastSync > AUTO_SYNC_AFTER_MS) sync(3);
  }, [data, lastSync, sync]);

  const rows = data ? vitalRows(day, data) : [];
  const streaks = data ? offStreaks(day, data) : [];
  const longHigh = streaks.some((s) => (s.key === "ruhepuls" || s.key === "temperatur") && s.days >= 5);
  const count = countInRange(rows.map((r) => ({ value: r.value, range: r.base.active })));
  const sentence = !data
    ? "Lädt …"
    : count.total
      ? `${count.inRange} von ${count.total} Werten in deinem Bereich.`
      : rows.some((r) => r.value !== null)
        ? "Deine Bereiche entstehen ab 14 Tagen Daten."
        : "Noch keine Werte von letzter Nacht.";

  return (
    <section className="card">
      <div className="card-row">
        <div className="stack">
          <span className="eyebrow">Deine Werte · Garmin{lastSync ? " · " + clock(new Date(lastSync)) : ""}</span>
          <h2>{sentence}</h2>
          {streaks.map((s) => (
            <Link key={s.key} href={`/verlauf?m=${s.key}`} className="row-link streak-line">
              {s.label} seit {s.days} Tagen {s.side} deinem Bereich ›
            </Link>
          ))}
          {longHigh && <span className="meta">Hält das an oder fühlst du dich krank, lass es ärztlich abklären.</span>}
        </div>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => sync(3)}>
          {busy ? "Läuft …" : "Synchronisieren"}
        </button>
      </div>
      {morning && !morning.ok && lastSync < new Date(morning.at).getTime() && (
        <p className="alert alert-inline">
          Der Abruf heute Morgen um {clock(new Date(morning.at))} hat nicht geklappt. Tippe auf „Synchronisieren“, um es jetzt zu versuchen. ({morning.message ?? "unbekannter Fehler"})
        </p>
      )}
      {error && <p className="alert alert-inline">{error}</p>}
      {note && <span className="meta">{note}</span>}

      <div className="segmented segmented-tabs segmented-4" role="group" aria-label="Ansicht">
        {VIEWS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
            {l}
          </button>
        ))}
      </div>

      {view === "werte" && (
        <div className="factor-list">
          {rows.map((r) => (
            <Link key={r.key} href={r.href ?? "/verlauf"} className="row-link">
              <RangeRow label={r.label} value={r.value} fmt={r.fmt} range={r.base.range} phase={r.base.phase} phaseName={r.base.phaseKey ? RANGE_PHASE_NAMES[r.base.phaseKey] : undefined} tone="neutral" />
            </Link>
          ))}
          <span className="meta factor-foot">Punkt = heute, Band = deine letzten 30 Tage, bei zyklusabhängigen Werten deine Zyklusphase. Tippen öffnet den Verlauf.</span>
        </div>
      )}
      {data && view === "schlaf" && <SleepCard data={data} />}
      {data && view === "hrv" && <HrvCard data={data} showPhases={showPhases} />}
      {data && view === "stress" && <StressCard day={day} data={data} />}
    </section>
  );
}
