"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isoDay } from "@/lib/dates";
import { syncGarmin } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { supabase } from "@/lib/supabase";

const AUTO_SYNC_AFTER_MS = 2 * 60 * 60 * 1000;

export type MorningRun = { at: string; ok: boolean; message: string | null };

// Garmin synchronisieren: automatisch beim ersten Öffnen (90 Tage) und nach 2 Stunden (3 Tage),
// sonst per Ziehen nach unten auf Heute. Meldet den Morgen-Abruf, wenn er heute fehlgeschlagen ist.
export function useGarminSync(data: Data | null, onSynced: () => void, enabled: boolean) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [morning, setMorning] = useState<MorningRun | null>(null);
  const autoDone = useRef(false);

  // Letzter automatischer Abruf am Morgen (fehlt die Tabelle noch, bleibt es still)
  useEffect(() => {
    if (!enabled) return;
    supabase()
      ?.from("garmin_sync_runs")
      .select("at, ok, message")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: run, error: e }) => setMorning(!e && run && isoDay(new Date(run.at)) === isoDay() ? run : null));
  }, [data, enabled]);

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
    if (!enabled || !data || autoDone.current) return;
    autoDone.current = true;
    if (!data.daily.length) sync(90); // erster Abruf: 90 Tage
    else if (Date.now() - lastSync > AUTO_SYNC_AFTER_MS) sync(3);
  }, [data, lastSync, sync, enabled]);

  const morningFailed = !!morning && !morning.ok && lastSync < new Date(morning.at).getTime();

  return { busy, error, note, lastSync, morning, morningFailed, sync };
}
