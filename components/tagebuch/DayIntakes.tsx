"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Intake, Medication } from "@/lib/health";
import { addAsNeeded, shortName } from "@/lib/intakes";
import IntakeChecklist from "@/components/IntakeChecklist";

// Einnahmen eines beliebigen Tages: regelmäßige abhaken (einzeln, Gruppe, alles), Bedarfs-Einnahmen zählen
export default function DayIntakes({ day }: { day: string }) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [m, t] = await Promise.all([
      sb.from("medications").select("*").eq("active", true).order("created_at"),
      sb.from("medication_intakes").select("id, medication_id, at, as_needed, slot, day").eq("day", day),
    ]);
    if (m.error || t.error) {
      setError("Einnahmen konnten nicht geladen werden: " + (m.error ?? t.error)?.message);
      return;
    }
    setMeds((m.data ?? []) as Medication[]);
    setIntakes((t.data ?? []) as Intake[]);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb || !meds.length) return null;
  const needed = meds.filter((m) => m.as_needed);

  const removeLast = async (m: Medication) => {
    const last = intakes.filter((i) => i.medication_id === m.id && i.as_needed).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (!last) return;
    const { error: e } = await sb.from("medication_intakes").delete().eq("id", last.id);
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };

  return (
    <section className="card">
      <h2>Medikamente und Supplements</h2>
      {error && <p className="alert alert-inline">{error}</p>}
      <IntakeChecklist day={day} meds={meds} intakes={intakes} onChanged={load} onError={setError} />
      {needed.map((m) => {
        const n = intakes.filter((i) => i.medication_id === m.id && i.as_needed).length;
        return (
          <div key={m.id} className="card-row list-line">
            <div className="stack">
              <span className="row-label">{shortName(m.name)} bei Bedarf</span>
              <span className="meta">{n} an diesem Tag</span>
            </div>
            <div className="counter">
              <button type="button" className="btn btn-soft btn-44" disabled={!n} aria-label="Einen Hub entfernen" onClick={() => removeLast(m)}>−</button>
              <button type="button" className="btn btn-soft btn-44" aria-label="Einen Hub eintragen" onClick={async () => { const e = await addAsNeeded(sb, day, m); setError(e ? "Das hat nicht geklappt: " + e : ""); load(); }}>+ Hub</button>
            </div>
          </div>
        );
      })}
      <span className="meta">Speichert sofort, unabhängig vom Knopf unten.</span>
    </section>
  );
}
