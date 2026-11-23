"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { ILLNESSES, illnessRule, RETURN_STEPS, type Illness } from "@/lib/health";
import DayPick from "@/components/ui/DayPick";
import EditSheet, { EditIcon } from "@/components/ui/EditSheet";

const toDate = (iso: string) => new Date(iso + "T12:00:00");
const dayText = (iso: string) => (iso === isoDay() ? "heute" : shortDate(toDate(iso)));

// Neue Krankheit, noch nicht gespeichert: Beginn und (beim Nachtragen) Ende wählen (Sammelliste Punkt 18)
type Draft = { kind: string; label: string; fever: boolean; below: boolean; started_on: string; over: boolean; ended_on: string };
// Eintrag im Bearbeiten-Bogen (Punkt 20)
type Edit = { id: string; label: string; started_on: string; ended_on: string | null; severity: number; fever: boolean; below_neck: boolean };

export default function IllnessSection() {
  const [list, setList] = useState<Illness[] | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ending, setEnding] = useState<string | null>(null); // „Wieder gesund“: letzter kranker Tag
  const [edit, setEdit] = useState<Edit | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("illnesses").select("*").order("started_on", { ascending: false }).limit(60);
    if (e) setError("Krankheiten konnten nicht geladen werden: " + e.message);
    setList((data ?? []) as Illness[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    setSaving(true);
    const { error: e } = await p;
    setSaving(false);
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
    return !e;
  };

  const active = list?.find((i) => !i.ended_on) ?? null;
  const lastEnded = list?.find((i) => i.ended_on);
  const showReturn = !active && lastEnded?.ended_on && lastEnded.ended_on >= isoDay(daysAgo(5));
  const rule = active ? illnessRule(active) : null;
  const past = (list ?? []).filter((i) => i.ended_on);

  const pick = (key: string, label: string, fever = false, below = false) =>
    setDraft({ kind: key, label, fever, below, started_on: isoDay(), over: false, ended_on: isoDay() });
  const saveDraft = async () => {
    if (!draft) return;
    const ok = await run(
      sb.from("illnesses").insert({
        kind: draft.kind,
        label: draft.label,
        started_on: draft.started_on,
        ended_on: draft.over ? (draft.ended_on < draft.started_on ? draft.started_on : draft.ended_on) : null,
        fever: draft.fever,
        below_neck: draft.below,
        severity: 2,
      }),
    );
    if (ok) setDraft(null);
  };
  const update = (patch: Partial<Illness>) => active && run(sb.from("illnesses").update(patch).eq("id", active.id));
  const open = (i: Illness) => setEdit({ id: i.id, label: i.label, started_on: i.started_on, ended_on: i.ended_on, severity: i.severity, fever: i.fever, below_neck: i.below_neck });
  const saveEdit = async () => {
    if (!edit) return;
    const ended = edit.ended_on && edit.ended_on < edit.started_on ? edit.started_on : edit.ended_on;
    const ok = await run(
      sb.from("illnesses").update({ label: edit.label.trim() || "Krankheit", started_on: edit.started_on, ended_on: ended, severity: edit.severity, fever: edit.fever, below_neck: edit.below_neck }).eq("id", edit.id),
    );
    if (ok) setEdit(null);
  };
  const remove = async () => {
    if (!edit) return;
    const ok = await run(sb.from("illnesses").delete().eq("id", edit.id));
    if (ok) setEdit(null);
  };

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      {active && rule && (
        <section className="card">
          <div className="card-row">
            <h2>{active.label}</h2>
            <button type="button" className="edit-row edit-row-end edit-row-inline" onClick={() => open(active)} aria-label={`${active.label} ändern, seit ${dayText(active.started_on)}`}>
              <span className="meta">seit {dayText(active.started_on)}</span>
              <EditIcon />
            </button>
          </div>
          <span className="label">Wie stark?</span>
          <div className="grid-5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className="pill pill-box" aria-pressed={active.severity === v} onClick={() => update({ severity: v })}>
                {v}
              </button>
            ))}
          </div>
          {(
            [
              ["fever", "Fieber"],
              ["below_neck", "Husten oder Gliederschmerzen"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="card-row">
              <span className="row-label">{l}</span>
              <div className="pills">
                <button type="button" className="pill pill-sm" aria-pressed={active[k]} onClick={() => update({ [k]: true } as Partial<Illness>)}>Ja</button>
                <button type="button" className="pill pill-sm" aria-pressed={!active[k]} onClick={() => update({ [k]: false } as Partial<Illness>)}>Nein</button>
              </div>
            </div>
          ))}
          <div className={rule.stop ? "rule rule-stop" : "rule"}>
            <span className="row-strong">Training: {rule.title}</span>
            <span>{rule.text}</span>
          </div>
          {ending === null ? (
            <button type="button" className="btn btn-dark" onClick={() => setEnding(isoDay())}>
              Wieder gesund
            </button>
          ) : (
            <>
              <DayPick label="Letzter Tag mit Beschwerden" value={ending} min={active.started_on} onChange={setEnding} />
              <div className="edit-sheet-actions">
                <button type="button" className="btn btn-dark" disabled={saving} onClick={async () => { if (await update({ ended_on: ending })) setEnding(null); }}>
                  Wieder gesund
                </button>
                <button type="button" className="btn btn-soft" onClick={() => setEnding(null)}>
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {!active && !draft && (
        <section className="card">
          <h2>Was hast du?</h2>
          <span className="meta">Auch zum Nachtragen: Beginn und Ende wählst du im nächsten Schritt.</span>
          <div className="pills wrap">
            {ILLNESSES.map((i) => (
              <button key={i.key} type="button" className="pill" onClick={() => pick(i.key, i.label, i.fever, i.below)}>
                {i.label}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input className="input" placeholder="Etwas anderes" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Andere Krankheit" />
            <button
              type="button"
              className="btn btn-quiet"
              disabled={!other.trim()}
              onClick={() => {
                pick("eigen", other.trim());
                setOther("");
              }}
            >
              Weiter
            </button>
          </div>
        </section>
      )}

      {draft && (
        <section className="card">
          <h2>{draft.label} eintragen</h2>
          <DayPick label="Seit wann?" value={draft.started_on} onChange={(d) => setDraft({ ...draft, started_on: d, ended_on: draft.ended_on < d ? d : draft.ended_on })} />
          <div className="day-pick">
            <span className="label">Schon vorbei?</span>
            <div className="pills wrap">
              <button type="button" className="pill pill-sm" aria-pressed={!draft.over} onClick={() => setDraft({ ...draft, over: false })}>
                Nein, noch krank
              </button>
              <button type="button" className="pill pill-sm" aria-pressed={draft.over} onClick={() => setDraft({ ...draft, over: true })}>
                Ja, schon vorbei
              </button>
            </div>
          </div>
          {draft.over && <DayPick label="Letzter Tag mit Beschwerden" value={draft.ended_on} min={draft.started_on} onChange={(d) => setDraft({ ...draft, ended_on: d })} />}
          <div className="edit-sheet-actions">
            <button type="button" className="btn btn-dark" disabled={saving} onClick={saveDraft}>
              Eintragen
            </button>
            <button type="button" className="btn btn-soft" onClick={() => setDraft(null)}>
              Abbrechen
            </button>
          </div>
        </section>
      )}

      {showReturn && (
        <section className="card">
          <h2>Wiedereinstieg in Stufen</h2>
          {RETURN_STEPS.map((s) => (
            <div key={s.when} className="list-row">
              <span className="row-strong">{s.when}</span>
              <span className="meta">{s.what}</span>
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="card">
          <details className="derive">
            <summary>Frühere Krankheiten ({past.length})</summary>
            {past.map((i) => {
              const days = Math.round((toDate(i.ended_on as string).getTime() - toDate(i.started_on).getTime()) / 864e5) + 1;
              return (
                <button key={i.id} type="button" className="card-row list-line edit-row" onClick={() => open(i)} aria-label={`${i.label}, ${shortDate(toDate(i.started_on))}, ${days} ${days === 1 ? "Tag" : "Tage"}, ändern`}>
                  <span>{i.label}</span>
                  <span className="edit-row-end">
                    <span className="meta">
                      {shortDate(toDate(i.started_on))} · {days} {days === 1 ? "Tag" : "Tage"}
                    </span>
                    <EditIcon />
                  </span>
                </button>
              );
            })}
          </details>
        </section>
      )}

      <EditSheet title="Krankheit ändern" open={!!edit} onClose={() => setEdit(null)} onSave={saveEdit} onDelete={remove} deleteQuestion="Diese Krankheit löschen?" saving={saving} canSave={!!edit?.label.trim()}>
        {edit && (
          <>
            <label className="field">
              <span className="label">Name</span>
              <input className="input" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
            </label>
            <DayPick label="Beginn" value={edit.started_on} onChange={(d) => setEdit({ ...edit, started_on: d })} />
            <div className="day-pick">
              <span className="label">Ende</span>
              <div className="pills wrap">
                <button type="button" className="pill pill-sm" aria-pressed={edit.ended_on === null} onClick={() => setEdit({ ...edit, ended_on: null })}>
                  Noch krank
                </button>
                <button type="button" className="pill pill-sm" aria-pressed={edit.ended_on !== null} onClick={() => setEdit({ ...edit, ended_on: edit.ended_on ?? isoDay() })}>
                  Vorbei
                </button>
              </div>
            </div>
            {edit.ended_on !== null && <DayPick label="Letzter Tag mit Beschwerden" value={edit.ended_on} min={edit.started_on} onChange={(d) => setEdit({ ...edit, ended_on: d })} />}
            <span className="label">Wie stark?</span>
            <div className="grid-5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" className="pill pill-box" aria-pressed={edit.severity === v} onClick={() => setEdit({ ...edit, severity: v })}>
                  {v}
                </button>
              ))}
            </div>
            {(
              [
                ["fever", "Fieber"],
                ["below_neck", "Husten oder Gliederschmerzen"],
              ] as const
            ).map(([k, l]) => (
              <div key={k} className="card-row">
                <span className="row-label">{l}</span>
                <div className="pills">
                  <button type="button" className="pill pill-sm" aria-pressed={edit[k]} onClick={() => setEdit({ ...edit, [k]: true })}>Ja</button>
                  <button type="button" className="pill pill-sm" aria-pressed={!edit[k]} onClick={() => setEdit({ ...edit, [k]: false })}>Nein</button>
                </div>
              </div>
            ))}
          </>
        )}
      </EditSheet>

      <span className="hint">Bitte ärztlich abklären: Fieber über mehrere Tage, Brustschmerz, Atemnot oder Herzrasen.</span>
    </>
  );
}
