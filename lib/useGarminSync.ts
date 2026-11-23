"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isoDay } from "@/lib/dates";
import { syncGarmin } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { supabase } from "@/lib/supabase";
import { announceNewData, POLL_MS } from "@/lib/refresh";

// Konzept Datenaktualisierung A2 und B2: Garmin nur abrufen, wenn der Stand alt ist.
const AUTO_SYNC_AFTER_MS = 60 * 60 * 1000; // sonst nach 60 Minuten
const AUTO_SYNC_AFTER_TRAINING_MS = 20 * 60 * 1000; // Training geplant, Aktivität fehlt noch: schon nach 20 Minuten
const MIN_GAP_MS = 30 * 60 * 1000; // höchstens ein automatischer Versuch je 30 Minuten auf diesem Gerät
const TRY_KEY = "hc-garmin-versuch";

const lastTry = () => {
  try {
    return Number(localStorage.getItem(TRY_KEY) ?? 0);
  } catch {
    return 0;
  }
};
const markTry = () => {
  try {
    localStorage.setItem(TRY_KEY, String(Date.now()));
  } catch {
    // ohne Speicher gilt nur die Grenze über den Datenstand
  }
};

export type MorningRun = { at: string; ok: boolean; message: string | null };

// Garmin synchronisieren: automatisch beim ersten Öffnen (90 Tage), danach kurz (1 Tag), wenn der Stand älter als
// 60 Minuten ist (20 Minuten, wenn heute ein Training geplant ist und die Aktivität noch fehlt). Geprüft wird beim Öffnen,
// beim Zurückkehren in die App und alle 15 Minuten, solange sie sichtbar ist. Sonst per Ziehen nach unten auf Heute.
// Nach dem Abruf laden alle angemeldeten Seiten neu (announceNewData). Meldet den Morgen-Abruf, wenn er heute fehlgeschlagen ist.
export function useGarminSync(data: Data | null, enabled: boolean) {
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
      if (res.sleepStagesNote) parts.push(res.sleepStagesNote);
      if (res.energyNote) parts.push(res.energyNote);
      if (res.stressNote) parts.push(res.stressNote);
      setNote(parts.join(" "));
      announceNewData();
    },
    [],
  );

  const lastSync = data ? data.daily.reduce((t, r) => Math.max(t, new Date(r.synced_at).getTime()), 0) : 0;

  // Neueste Werte für die Prüfung außerhalb von React (Sichtbarkeit, Takt)
  const state = useRef({ data, lastSync, busy, enabled });
  state.current = { data, lastSync, busy, enabled };

  const check = useCallback(async () => {
    const { data: d, lastSync: ls, busy: b, enabled: on } = state.current;
    if (!on || !d || b || document.visibilityState !== "visible") return;
    if (Date.now() - lastTry() < MIN_GAP_MS) return;
    let limit = AUTO_SYNC_AFTER_MS;
    const today = isoDay();
    if (!d.acts.some((a) => (a.start_local ?? "").slice(0, 10) === today)) {
      const planned = await supabase()?.from("planned_sessions").select("day", { count: "exact", head: true }).eq("day", today).eq("status", "geplant");
      if (planned?.count) limit = AUTO_SYNC_AFTER_TRAINING_MS;
    }
    if (Date.now() - ls <= limit) return;
    markTry();
    sync(1);
  }, [sync]);

  useEffect(() => {
    if (!enabled || !data || autoDone.current) return;
    autoDone.current = true;
    if (!data.daily.length) {
      markTry();
      sync(90); // erster Abruf: 90 Tage
    } else check();
  }, [data, sync, check, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => check();
    const t = window.setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check, enabled]);

  const morningFailed = !!morning && !morning.ok && lastSync < new Date(morning.at).getTime();

  return { busy, error, note, lastSync, morning, morningFailed, sync };
}
