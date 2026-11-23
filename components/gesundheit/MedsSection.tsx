"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo } from "@/lib/dates";
import { interactionNotes, MED_NOTES, MED_PRESETS, normTime, usualRange, weeklyCounts, weekStart, type Medication } from "@/lib/health";

const WEEKS = 9;

function scheduleText(m: Medication): string {
  const parts: string[] = [];
  if (m.regular && m.times.length) parts.push("Regelmäßig " + m.times.join(" und "));
  else if (m.regular) parts.push("Regelmäßig");
  if (m.as_needed) parts.push(m.regular ? "dazu bei Bedarf" : "Bei Bedarf");
  return parts.join(", ");
}

function guessNotesKey(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("bufori")) return "bufori";
  if (n.includes("omega")) return "omega3";
  if (n.includes("magnes")) return "magnesium";
  if (n.includes("vitamin d") || n.includes("vit. d") || n.includes("vitamin-d")) return "vitd";
  return null;
}

export default function MedsSection() {
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [hubIntakes, setHubIntakes] = useState<{ at: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [m, i] = await Promise.all([
      sb.from("medications").select("*").order("created_at"),
      sb.from("medication_intakes").select("at").eq("as_needed", true).gte("at", weekStart(daysAgo(7 * (WEEKS - 1))).toISOString()),
    ]);
    if (m.error) {
      setError("Medikamente konnten nicht geladen werden: " + m.error.message);
      return;
    }
    setMeds((m.data ?? []) as Medication[]);
    setHubIntakes((i.data ?? []) as { at: string }[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: e } = await p;
    if (e) setError("Das hat nicht geklappt: " + e.message);
    else setError("");
    load();
  };

  const sb = supabase();
  if (!sb) return null;

  const active = (meds ?? []).filter((m) => m.active);
  const inactive = (meds ?? []).filter((m) => !m.active);
  const hasNeeded = active.some((m) => m.as_needed);
  const counts = weeklyCounts(hubIntakes, WEEKS);
  const range = usualRange(counts.slice(0, -1));
  const current = counts[counts.length - 1];

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      {meds !== null && meds.length === 0 && (
        <section className="card">
          <h2>Deine Mittel anlegen</h2>
          <p>Soll ich Bufori (morgens und abends, dazu bei Bedarf) sowie Omega-3, Magnesium und Vitamin D (täglich 08:00) anlegen? Uhrzeiten und Mengen kannst du danach anpassen.</p>
          <button type="button" className="btn btn-dark" onClick={() => run(sb.from("medications").insert(MED_PRESETS))}>
            Ja, anlegen
          </button>
        </section>
      )}

      {active.map((m) => {
        const notes = m.notes_key ? MED_NOTES[m.notes_key] : null;
        const isOpen = open === m.id;
        return (
          <section key={m.id} className="card">
            <button type="button" className="card-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
              <span className="stack">
                <span className="row-strong">{m.name}</span>
                <span className="meta">
                  {scheduleText(m)}
                  {m.amount ? " · " + m.amount : ""}
                </span>
              </span>
              <span className={m.kind === "medikament" ? "badge badge-strong" : "badge"}>{m.kind === "medikament" ? "Medikament" : "Supplement"}</span>
            </button>
            {isOpen && (
              <div className="expand">
                {notes ? (
                  <>
                    <span className="eyebrow">Worauf achten</span>
                    <ul className="tips">
                      {notes.tips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    <span className="meta">{notes.source}</span>
                  </>
                ) : (
                  <p>Für dieses Mittel hat die App keine geprüften Hinweise. Lies die Gebrauchsinformation oder frag in der Apotheke.</p>
                )}
                {editing === m.id ? (
                  <EditMed
                    med={m}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) => {
                      setEditing(null);
                      run(sb.from("medications").update(patch).eq("id", m.id));
                    }}
                  />
                ) : (
                  <div className="footer-links left">
                    <button type="button" className="btn btn-link" onClick={() => setEditing(m.id)}>
                      Uhrzeiten und Menge ändern
                    </button>
                    <button type="button" className="btn btn-link" onClick={() => run(sb.from("medications").update({ active: false }).eq("id", m.id))}>
                      Nicht mehr nehmen
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {meds !== null && meds.length > 0 && (
        <>
          {interactionNotes(meds).map((n) => (
            <p key={n.text} className={n.warn ? "alert" : "note-ok"}>
              {n.text}
            </p>
          ))}
        </>
      )}

      {hasNeeded && (
        <section className="card">
          <div className="card-row">
            <h2>Bedarfs-Einnahmen pro Woche</h2>
            <span className="meta">üblich {range.lo}–{range.hi}</span>
          </div>
          <div className="bars" role="img" aria-label={`Bedarfs-Einnahmen der letzten ${WEEKS} Wochen, diese Woche ${current}`}>
            {counts.map((c, i) => {
              const over = c > range.hi;
              const now = i === counts.length - 1;
              return (
                <div key={i} className="bar-col">
                  <span className="bar-val">{c}</span>
                  <span className="bar" style={{ height: Math.max(3, c * 8) + "px", background: over ? (now ? "var(--warn)" : "var(--warn-mid)") : now ? "var(--text)" : "var(--line-strong)" }} />
                </div>
              );
            })}
          </div>
          <span className="meta">
            Die letzte Säule ist diese Woche.{range.own ? " Der übliche Bereich kommt aus deinen Vorwochen." : " Bis genug Daten da sind, gilt 2 bis 4 als üblich."}
          </span>
          {current > range.hi && <p className="alert">Diese Woche brauchst du mehr Bedarfs-Hübe als sonst. Bitte ärztlich abklären. Atemnot trotz Inhalator ist ein Notfall: 112.</p>}
        </section>
      )}

      {adding ? (
        <AddMed
          onCancel={() => setAdding(false)}
          onSave={(m) => {
            setAdding(false);
            run(sb.from("medications").insert(m));
          }}
        />
      ) : (
        <button type="button" className="btn btn-dashed" onClick={() => setAdding(true)}>
          + Medikament oder Supplement hinzufügen
        </button>
      )}

      {inactive.length > 0 && (
        <section className="card">
          <details className="derive">
          <summary>Frühere Mittel ({inactive.length})</summary>
          {inactive.map((m) => (
            <div key={m.id} className="card-row list-line">
              <span>{m.name}</span>
              <button type="button" className="btn btn-link" onClick={() => run(sb.from("medications").update({ active: true }).eq("id", m.id))}>
                Wieder aufnehmen
              </button>
            </div>
          ))}
          </details>
        </section>
      )}

      <span className="hint">Die Menge trägst du selbst ein, wie sie verordnet ist. Die App schlägt keine Dosis vor.</span>
    </>
  );
}

function parseTimes(text: string): string[] | null {
  if (!text.trim()) return [];
  const list = text.split(/[,;\s]+/).filter(Boolean).map(normTime);
  return list.every(Boolean) ? (list as string[]).sort() : null;
}

function EditMed({ med, onSave, onCancel }: { med: Medication; onSave: (p: Partial<Medication>) => void; onCancel: () => void }) {
  const [times, setTimes] = useState(med.times.join(", "));
  const [amount, setAmount] = useState(med.amount ?? "");
  const [msg, setMsg] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = parseTimes(times);
    if (t === null) return setMsg("Uhrzeiten bitte so: 07:30, 21:30");
    onSave({ times: t, amount: amount.trim() || null });
  };
  return (
    <form className="form" onSubmit={submit}>
      <label className="label" htmlFor={"t" + med.id}>Uhrzeiten</label>
      <input id={"t" + med.id} className="input" value={times} onChange={(e) => setTimes(e.target.value)} placeholder="07:30, 21:30" />
      <label className="label" htmlFor={"a" + med.id}>Menge (wie verordnet)</label>
      <input id={"a" + med.id} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 1 Hub" />
      {msg && <p className="login-msg">{msg}</p>}
      <div className="footer-links left">
        <button type="submit" className="btn btn-dark">Speichern</button>
        <button type="button" className="btn btn-link" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}

function AddMed({ onSave, onCancel }: { onSave: (m: Omit<Medication, "id" | "active">) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"medikament" | "supplement">("medikament");
  const [regular, setRegular] = useState(true);
  const [asNeeded, setAsNeeded] = useState(false);
  const [times, setTimes] = useState("08:00");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setMsg("Bitte einen Namen eintragen.");
    if (!regular && !asNeeded) return setMsg("Bitte regelmäßig, bei Bedarf oder beides wählen.");
    const t = regular ? parseTimes(times) : [];
    if (t === null) return setMsg("Uhrzeiten bitte so: 07:30, 21:30");
    onSave({ name: name.trim(), kind, regular, as_needed: asNeeded, times: t, amount: amount.trim() || null, notes_key: guessNotesKey(name) });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Neues Mittel</h2>
      <label className="label" htmlFor="mname">Name</label>
      <input id="mname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="pills">
        <button type="button" className="pill" aria-pressed={kind === "medikament"} onClick={() => setKind("medikament")}>Medikament</button>
        <button type="button" className="pill" aria-pressed={kind === "supplement"} onClick={() => setKind("supplement")}>Supplement</button>
      </div>
      <div className="pills">
        <button type="button" className="pill" aria-pressed={regular} onClick={() => setRegular(!regular)}>Regelmäßig</button>
        <button type="button" className="pill" aria-pressed={asNeeded} onClick={() => setAsNeeded(!asNeeded)}>Bei Bedarf</button>
      </div>
      {regular && (
        <>
          <label className="label" htmlFor="mtimes">Uhrzeiten</label>
          <input id="mtimes" className="input" value={times} onChange={(e) => setTimes(e.target.value)} placeholder="07:30, 21:30" />
        </>
      )}
      <label className="label" htmlFor="mamount">Menge (wie verordnet, freiwillig)</label>
      <input id="mamount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      {msg && <p className="login-msg">{msg}</p>}
      <div className="footer-links left">
        <button type="submit" className="btn btn-dark">Hinzufügen</button>
        <button type="button" className="btn btn-link" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}
