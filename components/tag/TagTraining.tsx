"use client";

// Training eines Tages im Tagesblatt (Konzept docs/konzept-buendeln.md, Baustein 1):
// geplante, erfasste und Garmin-Einheiten; kommende Tage planen, heute und früher erfassen (Eintragen-Blatt).
// Vorher Teil von components/training/CalendarSection.tsx.

import Link from "next/link";
import { useState } from "react";
import EditSheet from "@/components/ui/EditSheet";
import SportIcon from "@/components/ui/SportIcon";
import { supabase } from "@/lib/supabase";
import { isoDay, longDate } from "@/lib/dates";
import { activityLabel, durationText, type Activity } from "@/lib/garmin";
import type { Illness, Injury } from "@/lib/health";
import { announceNewData } from "@/lib/refresh";
import { DEFAULT_TIMES, fromIso, healthEffect, sportOf, SPORTS, type Session, type Sport } from "@/lib/training";

const ADDABLE: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];
const DURATIONS = [30, 45, 60, 90];
type Log = { id: string | null; day: string; sport: Sport; duration: string; rpe: number | null };

export default function TagTraining({ day, sessions, acts, illness, injuries, onChanged }: { day: string; sessions: Session[]; acts: Activity[]; illness: Illness | null; injuries: Injury[]; onChanged: () => void }) {
  const [log, setLog] = useState<Log | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sb = supabase();
  if (!sb) return null;

  const today = isoDay();
  const future = day > today;
  const doneByGarmin = (s: Session) => acts.some((a) => sportOf(a) === s.sport);
  const changed = () => {
    onChanged();
    announceNewData();
  };
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: e } = await p;
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    changed();
  };
  const moveTomorrow = (s: Session) => {
    const d = fromIso(s.day);
    d.setDate(d.getDate() + 1);
    run(sb.from("planned_sessions").update({ day: isoDay(d), source: "eigen" }).eq("id", s.id));
  };
  // Erfassen speichert als erledigt. Neu: Zeile anlegen, vorhanden (geplant oder erledigt): Zeile ändern.
  const saveLog = async () => {
    if (!log) return;
    setSaving(true);
    const min = Number(log.duration);
    const fields = { status: "erledigt" as const, duration_min: Number.isFinite(min) && min >= 1 && min <= 600 ? Math.round(min) : null, rpe: log.rpe };
    const { error: e } = log.id
      ? await sb.from("planned_sessions").update(fields).eq("id", log.id)
      : await sb.from("planned_sessions").insert({ day: log.day, sport: log.sport, time: null, source: "eigen", ...fields });
    setSaving(false);
    if (e) return setError("Das hat nicht geklappt: " + e.message);
    setError("");
    setLog(null);
    changed();
  };
  const removeLog = async () => {
    if (!log?.id) return;
    const id = log.id;
    setLog(null);
    await run(sb.from("planned_sessions").delete().eq("id", id));
  };
  const openLog = (s: Session) => setLog({ id: s.id, day: s.day, sport: s.sport, duration: s.duration_min ? String(s.duration_min) : "", rpe: s.rpe ?? null });

  return (
    <>
      {error && <p className="alert alert-inline" role="alert">{error}</p>}
      {!sessions.length && !acts.length && <p className="meta">{future ? "Nichts geplant." : "Kein Training an diesem Tag."}</p>}
      {sessions.map((s) => {
        const garmin = doneByGarmin(s);
        const done = s.status === "erledigt" || garmin;
        const eff = !done && s.status !== "ausgelassen" ? healthEffect(s.sport, s.day, illness, injuries) : null;
        return (
          <div key={s.id} className="stack list-line">
            <div className="card-row">
              <span className="row-strong tag-act">
                <span className="today-act-icon is-training" aria-hidden="true"><SportIcon sport={s.sport} size={18} /></span>
                {SPORTS[s.sport].label}
                {s.time && s.status === "geplant" ? " · " + s.time : ""}
                {s.duration_min ? " · " + s.duration_min + " min" : ""}
                {s.rpe ? " · Anstrengung " + s.rpe : ""}
              </span>
              <span className={done ? "badge badge-ok" : s.status === "ausgelassen" ? "badge" : eff?.kind === "pause" || eff?.kind === "gesperrt" ? "badge badge-warn" : "badge badge-training"}>
                {done ? (garmin ? "erledigt · Garmin" : "erledigt") : s.status === "ausgelassen" ? "ausgelassen" : eff?.kind === "pause" ? "Pause" : eff?.kind === "gesperrt" ? "pausiert" : "geplant"}
              </span>
            </div>
            {eff && <span className="meta meta-warn">{eff.text}</span>}
            {!garmin && (
              <div className="footer-links left">
                {!future && s.status !== "erledigt" && <button type="button" className="btn btn-link" onClick={() => openLog(s)}>Erledigt</button>}
                {s.status === "erledigt" && <button type="button" className="btn btn-link" onClick={() => openLog(s)}>Bearbeiten</button>}
                {s.status === "geplant" && <button type="button" className="btn btn-link" onClick={() => run(sb.from("planned_sessions").update({ status: "ausgelassen" }).eq("id", s.id))}>Auslassen</button>}
                {s.status === "ausgelassen" && <button type="button" className="btn btn-link" onClick={() => run(sb.from("planned_sessions").update({ status: "geplant" }).eq("id", s.id))}>Zurücksetzen</button>}
                {s.status === "geplant" && s.day >= today && <button type="button" className="btn btn-link" onClick={() => moveTomorrow(s)}>Auf morgen</button>}
                {s.status !== "erledigt" && <button type="button" className="btn btn-link" onClick={() => run(sb.from("planned_sessions").delete().eq("id", s.id))}>Löschen</button>}
              </div>
            )}
          </div>
        );
      })}
      {acts.map((a) => (
        <Link key={a.activity_id} href={`/training/einheit/${a.activity_id}`} className="card-row list-line unit-link">
          <span className="row-strong tag-act">
            <span className="today-act-icon is-training" aria-hidden="true"><SportIcon sport={sportOf(a)} size={18} /></span>
            {activityLabel(a)}
          </span>
          <span className="meta">
            {[durationText(a.duration_s), a.avg_hr ? "Puls Ø " + a.avg_hr : ""].filter(Boolean).join(" · ")} · Garmin
            <span className="row-chev" aria-hidden="true">›</span>
          </span>
        </Link>
      ))}
      <span className="meta">{future ? "Planen:" : "Erfassen:"}</span>
      <div className="pills wrap">
        {ADDABLE.map((sp) => (
          <button
            key={sp}
            type="button"
            className="pill pill-sm"
            disabled={sessions.some((s) => s.sport === sp && s.source === "eigen")}
            onClick={() => (future ? run(sb.from("planned_sessions").insert({ day, sport: sp, time: DEFAULT_TIMES[sp] ?? null, source: "eigen" })) : setLog({ id: null, day, sport: sp, duration: "", rpe: null }))}
          >
            + {SPORTS[sp].label}
          </button>
        ))}
      </div>
      <span className="meta">{future ? "Tippe auf eine Sportart, um sie für diesen Tag zu planen." : "Erfasste Einheiten zählen bei den Trainingstagen und in der Muskelbelastung. Hat Garmin die Einheit schon, brauchst du nichts einzutragen."}</span>

      <EditSheet
        title={log ? `${SPORTS[log.sport].label} · ${longDate(fromIso(log.day))}` : "Einheit erfassen"}
        open={!!log}
        onClose={() => setLog(null)}
        onSave={saveLog}
        onDelete={log?.id ? removeLog : undefined}
        deleteQuestion="Diese Einheit löschen?"
        saving={saving}
      >
        {log && (
          <>
            <div className="day-pick">
              <span className="label">Dauer</span>
              <div className="pills wrap">
                {DURATIONS.map((m) => (
                  <button key={m} type="button" className="pill pill-sm" aria-pressed={log.duration === String(m)} onClick={() => setLog({ ...log, duration: String(m) })}>
                    {m} min
                  </button>
                ))}
              </div>
              <label className="field">
                <span className="meta">oder Minuten eintippen</span>
                <input className="input" inputMode="numeric" value={log.duration} onChange={(e) => setLog({ ...log, duration: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} aria-label="Dauer in Minuten" />
              </label>
            </div>
            <div className="day-pick">
              <span className="label">Anstrengung (1–10)</span>
              <div className="pills wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className="pill pill-sm" aria-pressed={log.rpe === n} aria-label={`Anstrengung ${n}`} onClick={() => setLog({ ...log, rpe: log.rpe === n ? null : n })}>
                    {n}
                  </button>
                ))}
              </div>
              <span className="meta">1 sehr leicht · 5 mittel · 10 maximal. Freiwillig.</span>
            </div>
          </>
        )}
      </EditSheet>
    </>
  );
}
