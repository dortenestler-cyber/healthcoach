"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RangeRow } from "@/components/charts";
import HrvCard from "@/components/heute/HrvCard";
import SleepCard from "@/components/heute/SleepCard";
import StressCard from "@/components/heute/StressCard";
import { countInRange } from "@/lib/baseline";
import { clock } from "@/lib/dates";
import { syncGarmin } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { vitalRows } from "@/lib/today";

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
  const autoDone = useRef(false);

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
        </div>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => sync(3)}>
          {busy ? "Läuft …" : "Synchronisieren"}
        </button>
      </div>
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
              <RangeRow label={r.label} value={r.value} fmt={r.fmt} range={r.base.range} luteal={r.base.luteal} tone="neutral" />
            </Link>
          ))}
          <span className="meta factor-foot">Punkt = heute, Band = deine letzten 30 Tage. Tippen öffnet den Verlauf.</span>
        </div>
      )}
      {data && view === "schlaf" && <SleepCard data={data} />}
      {data && view === "hrv" && <HrvCard data={data} showPhases={showPhases} />}
      {data && view === "stress" && <StressCard day={day} data={data} />}
    </section>
  );
}
