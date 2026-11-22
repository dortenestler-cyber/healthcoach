"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { atFor } from "@/lib/intakes";

// Hitzewallungen eines Tages zählen und nachtragen. Heute mit Uhrzeit jetzt, an vergangenen Tagen um 12:00.
export default function FlashCounter({ day }: { day: string }) {
  const [rows, setRows] = useState<{ id: string; at: string }[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = new Date(day + "T00:00:00");
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    const { data, error: e } = await sb.from("hot_flashes").select("id, at").gte("at", from.toISOString()).lt("at", to.toISOString()).order("at");
    if (e) setError("Hitzewallungen konnten nicht geladen werden: " + e.message);
    setRows((data ?? []) as { id: string; at: string }[]);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;
  const add = async () => {
    const { error: e } = await sb.from("hot_flashes").insert({ at: atFor(day, null), source: "app" });
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };
  const remove = async () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    const { error: e } = await sb.from("hot_flashes").delete().eq("id", last.id);
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };

  return (
    <section className="card">
      <div className="card-row">
        <div className="stack">
          <h2>Hitzewallungen</h2>
          <span className="big-number">{rows.length}</span>
          <span className="meta">an diesem Tag</span>
        </div>
        <div className="counter">
          <button type="button" className="btn btn-soft btn-44" disabled={!rows.length} aria-label="Eine Hitzewallung entfernen" onClick={remove}>−</button>
          <button type="button" className="btn btn-soft btn-44" aria-label="Eine Hitzewallung eintragen" onClick={add}>+ Eintragen</button>
        </div>
      </div>
      {error && <p className="alert alert-inline">{error}</p>}
      <span className="meta">Speichert sofort, unabhängig vom Knopf unten.</span>
    </section>
  );
}
