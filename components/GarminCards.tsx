"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clock, daysAgo, isoDay } from "@/lib/dates";
import { METRICS, stats, syncGarmin, type Daily, type MetricKey } from "@/lib/garmin";

const SHOWN: MetricKey[] = ["schlaf", "hrv", "ruhepuls", "bb"];
const AUTO_SYNC_AFTER_MS = 2 * 60 * 60 * 1000;

// Garmin-Werte auf der Seite Heute: Synchronisieren und vier Karten
export default function GarminCards({ onSynced }: { onSynced?: () => void } = {}) {
  const [rows, setRows] = useState<Daily[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const autoDone = useRef(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return [];
    const { data, error: e } = await sb.from("garmin_daily").select("*").gte("day", isoDay(daysAgo(29))).order("day");
    if (e) {
      setError("Garmin-Werte konnten nicht geladen werden: " + e.message);
      return [];
    }
    const list = (data ?? []) as Daily[];
    setRows(list);
    setLoaded(true);
    return list;
  }, []);

  const sync = useCallback(
    async (days: number) => {
      setBusy(true);
      setError("");
      const res = await syncGarmin(days);
      setBusy(false);
      if (!res.ok) setError("Synchronisieren hat nicht geklappt: " + res.error);
      await load();
      if (res.ok) onSynced?.();
    },
    [load, onSynced]
  );

  useEffect(() => {
    load().then((list) => {
      if (autoDone.current) return;
      autoDone.current = true;
      const last = list.reduce((t, r) => Math.max(t, new Date(r.synced_at).getTime()), 0);
      if (!list.length) sync(90); // erster Abruf: 90 Tage
      else if (Date.now() - last > AUTO_SYNC_AFTER_MS) sync(3);
    });
  }, [load, sync]);

  const lastSync = rows.reduce((t, r) => Math.max(t, new Date(r.synced_at).getTime()), 0);

  const card = (key: MetricKey) => {
    const m = METRICS[key];
    const withValue = rows.filter((r) => m.value(r) !== null);
    const latest = withValue[withValue.length - 1];
    const v = latest ? m.value(latest) : null;
    const st = stats(withValue.slice(0, -1).map((r) => m.value(r) as number));
    let note = latest && latest.day !== isoDay() ? "vom " + latest.day.slice(8, 10) + "." + latest.day.slice(5, 7) + "." : "heute";
    let warn = false;
    if (v !== null && st && st.sd > 0) {
      const z = (v - st.mean) / st.sd;
      if (Math.abs(z) < 0.75) note = "im Normalbereich";
      else {
        const better = (z > 0) === m.higherIsBetter;
        note = z > 0 ? "über deinem Schnitt" : "unter deinem Schnitt";
        warn = !better;
      }
    }
    return (
      <Link key={key} href={`/verlauf?m=${key}`} className="metric">
        <span className="meta">{m.label} ›</span>
        <span className="metric-value">{v === null ? "–" : m.fmt(v)}</span>
        <span className={warn ? "meta meta-warn" : "meta"}>{v === null ? "noch keine Daten" : note}</span>
      </Link>
    );
  };

  return (
    <>
      <section className="card card-tight">
        <div className="card-row">
          <div className="stack">
            <span className="row-strong">Garmin{lastSync ? " · " + clock(new Date(lastSync)) : ""}</span>
            <span className="meta">
              {busy ? "Holt deine Daten …" : lastSync ? "Zuletzt synchronisiert" : loaded ? "Noch nicht synchronisiert" : "Lädt …"}
            </span>
          </div>
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => sync(3)}>
            {busy ? "Läuft …" : "Synchronisieren"}
          </button>
        </div>
        {error && <p className="alert alert-inline">{error}</p>}
      </section>
      <div className="metric-grid">{SHOWN.map(card)}</div>
    </>
  );
}
