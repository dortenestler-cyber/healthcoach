"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Intake, Medication } from "@/lib/health";
import { check, groupsFor, slotLabel, uncheck, type Item } from "@/lib/intakes";

type Props = {
  day: string;
  meds: Medication[];
  intakes: Intake[];
  onChanged: () => void;
  onError: (msg: string) => void;
  onBufori?: (taken: boolean) => void; // Hinweis „Mund ausspülen“ nach einem Inhalator
};

// Regelmäßige Einnahmen eines Tages: jede einzeln, jede Uhrzeit-Gruppe mit „Alle abhaken“, oben „Alles abhaken“
export default function IntakeChecklist({ day, meds, intakes, onChanged, onError, onBufori }: Props) {
  const [busy, setBusy] = useState(false);
  const groups = groupsFor(meds, intakes);
  const all = groups.flatMap((g) => g.items);
  const done = all.filter((i) => i.done).length;
  if (!all.length) return null;

  const run = async (fn: () => Promise<string | null>, items: Item[], taking: boolean) => {
    const sb = supabase();
    if (!sb || busy) return;
    setBusy(true);
    const e = await fn.call(null);
    setBusy(false);
    if (e) onError("Das hat nicht geklappt: " + e);
    else onError("");
    onBufori?.(taking && items.some((i) => i.med.notes_key === "bufori"));
    onChanged();
  };
  const take = (items: Item[]) => run(() => check(supabase()!, day, items), items, true);
  const undo = (items: Item[]) => run(() => uncheck(supabase()!, items), items, false);
  const toggle = (i: Item) => (i.done ? undo([i]) : take([i]));

  return (
    <div className="intakes" aria-busy={busy}>
      <div className="card-row intake-all">
        <span className="meta">{done === all.length ? "Alles erledigt" : `${done} von ${all.length} erledigt`}</span>
        <button type="button" className="btn btn-soft btn-44" disabled={busy || done === all.length} onClick={() => take(all)}>
          Alles abhaken
        </button>
      </div>
      {groups.map((g) =>
        g.bundled ? (
          <div key={g.key} className="intake-group">
            <div className="card-row list-line">
              <div className="stack">
                <span className="row-label">{g.title}</span>
                <span className="meta">{slotLabel(g.slot)} · {g.items.filter((i) => i.done).length} von {g.items.length}</span>
              </div>
              {g.items.every((i) => i.done) ? (
                <button type="button" className="pill pill-done btn-44" disabled={busy} onClick={() => undo(g.items)}>
                  ✓ alle
                </button>
              ) : (
                <button type="button" className="pill btn-44" disabled={busy} onClick={() => take(g.items)}>
                  Alle abhaken
                </button>
              )}
            </div>
            {g.items.map((i) => (
              <div key={i.key} className="card-row intake-sub">
                <span className="row-label">{i.med.name}{i.med.amount ? <span className="meta"> · {i.med.amount}</span> : null}</span>
                <button type="button" className={i.done ? "pill pill-done btn-44" : "pill btn-44"} disabled={busy} onClick={() => toggle(i)} aria-label={`${i.med.name} ${i.done ? "genommen, zurücknehmen" : "abhaken"}`}>
                  {i.done ? "✓" : "Abhaken"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div key={g.key} className="card-row list-line">
            <div className="stack">
              <span className="row-label">{g.title}</span>
              <span className="meta">Regelmäßig · {slotLabel(g.slot)}{g.items[0].med.amount ? " · " + g.items[0].med.amount : ""}</span>
            </div>
            <button type="button" className={g.items[0].done ? "pill pill-done btn-44" : "pill btn-44"} disabled={busy} onClick={() => toggle(g.items[0])}>
              {g.items[0].done ? "✓ genommen" : "Abhaken"}
            </button>
          </div>
        ),
      )}
    </div>
  );
}
