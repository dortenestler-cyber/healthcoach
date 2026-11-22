"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RangeRow } from "@/components/charts";
import { countInRange } from "@/lib/baseline";
import { clock } from "@/lib/dates";
import { syncGarmin } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { vitalRows } from "@/lib/today";

const AUTO_SYNC_AFTER_MS = 2 * 60 * 60 * 1000;

// Vitalwerte der letzten Nacht, jeder mit deinem Bereich. Dazu Garmin synchronisieren (automatisch nach 2 Stunden).
export default function VitalsCard({ day, data, onSynced }: { day: string; data: Data | null; onSynced: () => void }) {
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
          <span className="meta">Vitalwerte · Garmin{lastSync ? " · " + clock(new Date(lastSync)) : ""}</span>
          <h2>{sentence}</h2>
        </div>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => sync(3)}>
          {busy ? "Läuft …" : "Synchronisieren"}
        </button>
      </div>
      {error && <p className="alert alert-inline">{error}</p>}
      {note && <span className="meta">{note}</span>}
      <div className="factor-list">
        {rows.map((r) => (
          <Link key={r.key} href={r.href ?? "/verlauf"} className="row-link">
            <RangeRow label={r.label} value={r.value} fmt={r.fmt} range={r.base.range} luteal={r.base.luteal} tone="neutral" />
          </Link>
        ))}
      </div>
    </section>
  );
}
