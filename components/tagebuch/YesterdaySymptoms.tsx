"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { symptomLabel } from "@/lib/catalog";

const LEVEL = ["", "leicht", "mittel", "stark"];

const shift = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const active = (s: Record<string, number> | null | undefined) => Object.fromEntries(Object.entries(s ?? {}).filter(([, v]) => v > 0));

// Teil des Morgen-Check-ins: Symptome von gestern bestätigen.
// Erscheint nur, wenn gestern Symptome eingetragen sind, heute noch keine und die Frage heute noch offen ist.
// Ohne Antwort zählen die Symptome von gestern in Readiness und Training nur halb (lib/insights.ts, symptomBasis).
export default function YesterdaySymptoms({ day, onChanged }: { day: string; onChanged?: () => void }) {
  const [yesterday, setYesterday] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [y, t] = await Promise.all([
      sb.from("diary_entries").select("symptoms").eq("day", shift(day, -1)).maybeSingle(),
      sb.from("diary_entries").select("*").eq("day", day).maybeSingle(),
    ]);
    const ys = active(y.data?.symptoms);
    const today = t.data as { symptoms?: Record<string, number>; symptoms_checked?: boolean } | null;
    setYesterday(ys);
    setOpen(Object.keys(ys).length > 0 && !today?.symptoms_checked && Object.keys(active(today?.symptoms)).length === 0);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  if (!open) return null;

  const answer = async (kind: "da" | "besser" | "weg") => {
    const sb = supabase();
    if (!sb) return;
    const next =
      kind === "da" ? yesterday : kind === "besser" ? active(Object.fromEntries(Object.entries(yesterday).map(([k, v]) => [k, v - 1]))) : {};
    setBusy(true);
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day, symptoms: next, symptoms_checked: true, manual: true, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    setBusy(false);
    if (e) {
      setError("Das hat nicht geklappt: " + e.message);
      return;
    }
    setError("");
    setOpen(false);
    onChanged?.();
  };

  const list = Object.entries(yesterday)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${symptomLabel(k)} (${LEVEL[Math.min(3, v)]})`)
    .join(", ");

  return (
    <div className="checkin-yesterday">
      <span className="row-label">Gestern hattest du: {list}. Wie ist es heute?</span>
      <div className="pills wrap">
        <button type="button" className="pill" disabled={busy} onClick={() => answer("da")}>Noch da</button>
        <button type="button" className="pill" disabled={busy} onClick={() => answer("besser")}>Besser</button>
        <button type="button" className="pill" disabled={busy} onClick={() => answer("weg")}>Weg</button>
      </div>
      {error && <p className="alert alert-inline">{error}</p>}
    </div>
  );
}
