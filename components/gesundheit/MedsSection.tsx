"use client";

import { useCallback, useEffect, useState } from "react";
import EditSheet from "@/components/ui/EditSheet";
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
  // Eintragen-Blatt: neues Mittel (med = null) oder ein bestehendes ändern
  const [sheet, setSheet] = useState<{ med: Medication | null } | null>(null);
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
                <div className="footer-links left">
                  <button type="button" className="btn btn-link" onClick={() => setSheet({ med: m })}>
                    Ändern
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => run(sb.from("medications").update({ active: false }).eq("id", m.id))}>
                    Nicht mehr nehmen
                  </button>
                </div>
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

      <button type="button" className="btn btn-dashed" onClick={() => setSheet({ med: null })}>
        + Medikament oder Supplement hinzufügen
      </button>

      {inactive.length > 0 && (
        <section className="card">
          <details className="derive">
          <summary>Frühere Mittel ({inactive.length})</summary>
          {inactive.map((m) => (
            <div key={m.id} className="card-row list-line">
              <span>{m.name}</span>
              <span className="footer-links">
                <button type="button" className="btn btn-link" onClick={() => setSheet({ med: m })}>
                  Ändern
                </button>
                <button type="button" className="btn btn-link" onClick={() => run(sb.from("medications").update({ active: true }).eq("id", m.id))}>
                  Wieder aufnehmen
                </button>
              </span>
            </div>
          ))}
          </details>
        </section>
      )}

      <span className="hint">Die Menge trägst du selbst ein, wie sie verordnet ist. Die App schlägt keine Dosis vor.</span>

      {sheet && (
        <MedSheet
          key={sheet.med?.id ?? "neu"}
          med={sheet.med}
          onClose={() => setSheet(null)}
          onSave={(m) => {
            const med = sheet.med;
            setSheet(null);
            run(med ? sb.from("medications").update(m).eq("id", med.id) : sb.from("medications").insert(m));
          }}
          // Löschen nur bei früheren Mitteln, aktive setzt man auf „Nicht mehr nehmen“
          onDelete={
            sheet.med && !sheet.med.active
              ? () => {
                  const id = sheet.med!.id;
                  setSheet(null);
                  run(sb.from("medications").delete().eq("id", id));
                }
              : undefined
          }
        />
      )}
    </>
  );
}

function parseTimes(text: string): string[] | null {
  if (!text.trim()) return [];
  const list = text.split(/[,;\s]+/).filter(Boolean).map(normTime);
  return list.every(Boolean) ? (list as string[]).sort() : null;
}

// Ein Blatt zum Anlegen und Ändern (Eintragen-Blatt): Name, Art, regelmäßig/bei Bedarf, Uhrzeiten, Menge.
// Löschen nur bei früheren Mitteln. Die Menge trägt die Nutzerin selbst ein, die App schlägt keine Dosis vor.
type MedFields = Omit<Medication, "id" | "active">;
function MedSheet({ med, onSave, onClose, onDelete }: { med: Medication | null; onSave: (m: MedFields) => void; onClose: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(med?.name ?? "");
  const [kind, setKind] = useState<"medikament" | "supplement">(med?.kind ?? "medikament");
  const [regular, setRegular] = useState(med?.regular ?? true);
  const [asNeeded, setAsNeeded] = useState(med?.as_needed ?? false);
  const [times, setTimes] = useState(med ? med.times.join(", ") : "08:00");
  const [amount, setAmount] = useState(med?.amount ?? "");
  const [msg, setMsg] = useState("");
  const submit = () => {
    if (!name.trim()) return setMsg("Bitte einen Namen eintragen.");
    if (!regular && !asNeeded) return setMsg("Bitte regelmäßig, bei Bedarf oder beides wählen.");
    const t = regular ? parseTimes(times) : [];
    if (t === null) return setMsg("Uhrzeiten bitte so: 07:30, 21:30");
    onSave({ name: name.trim(), kind, regular, as_needed: asNeeded, times: t, amount: amount.trim() || null, notes_key: guessNotesKey(name) ?? med?.notes_key ?? null });
  };
  const id = med?.id ?? "neu";
  return (
    <EditSheet
      title={med ? "Mittel ändern" : "Neues Mittel"}
      open
      onClose={onClose}
      onSave={submit}
      saveLabel={med ? "Speichern" : "Hinzufügen"}
      onDelete={onDelete}
      deleteQuestion={`„${med?.name ?? ""}“ löschen? Alle Einnahmen dazu werden mit gelöscht.`}
      error={msg}
    >
      <label className="field">
        <span className="label">Name</span>
        <input id={"n" + id} className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="pills wrap" role="group" aria-label="Art">
        <button type="button" className="pill btn-44" aria-pressed={kind === "medikament"} onClick={() => setKind("medikament")}>Medikament</button>
        <button type="button" className="pill btn-44" aria-pressed={kind === "supplement"} onClick={() => setKind("supplement")}>Supplement</button>
      </div>
      <div className="pills wrap" role="group" aria-label="Wann">
        <button type="button" className="pill btn-44" aria-pressed={regular} onClick={() => setRegular(!regular)}>Regelmäßig</button>
        <button type="button" className="pill btn-44" aria-pressed={asNeeded} onClick={() => setAsNeeded(!asNeeded)}>Bei Bedarf</button>
      </div>
      {regular && (
        <label className="field">
          <span className="label">Uhrzeiten</span>
          <input id={"t" + id} className="input" value={times} onChange={(e) => setTimes(e.target.value)} placeholder="07:30, 21:30" />
        </label>
      )}
      <label className="field">
        <span className="label">Menge (wie verordnet, freiwillig)</span>
        <input id={"a" + id} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 1 Hub" />
      </label>
    </EditSheet>
  );
}
