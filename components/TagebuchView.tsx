"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate, shortDate } from "@/lib/dates";
import { BLEEDING, GRID_ROWS, LEVELS, splitFrequent, SYMPTOMS } from "@/lib/catalog";
import { OVULATION_SIGNS } from "@/lib/ovulation";
import { DEFAULT_HABITS, loadHabits, SAUNA_GAENGE, SAUNA_WANN, WANN_LABEL, type Habit, type HabitDetails, type SaunaDetails } from "@/lib/habits";
import PageHead from "@/components/PageHead";
import CheckinCard from "@/components/tagebuch/CheckinCard";
import DayIntakes from "@/components/tagebuch/DayIntakes";
import FlashCounter from "@/components/tagebuch/FlashCounter";
import MuscleSection from "@/components/tagebuch/MuscleSection";
import { useFeatures } from "@/lib/prefs";

type Entry = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[] };

const DAYS = 28;
// Symptom-Stärke 0 bis 3 in Amber
const heat = ["var(--line-soft)", "var(--warn-bg)", "var(--warn-mid)", "var(--warn)"];

const shift = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Tagebuch für heute oder einen vergangenen Tag: Check-in, Blutung, Symptome mit Hitzewallungen, Gewohnheiten, Einnahmen.
// Hier wird alles eingetragen; Heute zeigt nur, was offen ist. Vergangene Perioden trägst du auf der Seite Zyklus nach.
// Dazu vergangene Perioden schnell nachtragen.
export default function TagebuchView({ initial }: { initial?: string }) {
  const today = isoDay();
  const [day, setDay] = useState(initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) && initial <= today ? initial : today);
  const feat = useFeatures();
  const [bleeding, setBleeding] = useState(0);
  const [symptoms, setSymptoms] = useState<Record<string, number>>({});
  const [influences, setInfluences] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [details, setDetails] = useState<HabitDetails>({});
  const [detailsNote, setDetailsNote] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);
  const [muscle, setMuscle] = useState<Map<string, number>>(new Map());
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [moreSym, setMoreSym] = useState(false);
  const [ovSigns, setOvSigns] = useState<string[]>([]);
  const [ovReady, setOvReady] = useState(false); // Spalte ovulation_signs vorhanden
  const [moreHab, setMoreHab] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [h, d] = await Promise.all([
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(DAYS - 1))).order("day"),
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").eq("day", day).maybeSingle(),
    ]);
    if (h.error || d.error) {
      setError("Tagebuch konnte nicht geladen werden: " + (h.error ?? d.error)?.message);
      return;
    }
    setHistory((h.data ?? []) as Entry[]);
    const t = d.data as Entry | null;
    setBleeding(t?.bleeding ?? 0);
    setSymptoms(t?.symptoms ?? {});
    setInfluences(t?.influences ?? []);
    // Gewohnheiten-Liste und Details (Details erst nach der Migration, sonst leer)
    loadHabits(sb).then(setHabits).catch(() => undefined);
    const det = await sb.from("diary_entries").select("habit_details").eq("day", day).maybeSingle();
    setDetails(det.error ? {} : (((det.data as { habit_details?: HabitDetails } | null)?.habit_details ?? {}) as HabitDetails));
    // Eisprung-Zeichen erst nach der Migration (Daten), sonst ausgeblendet
    const ov = await sb.from("diary_entries").select("ovulation_signs").eq("day", day).maybeSingle();
    setOvReady(!ov.error);
    setOvSigns(ov.error ? [] : ((ov.data as { ovulation_signs?: string[] } | null)?.ovulation_signs ?? []));
    setSaved(!!t);
    setDirty(false);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  // Wadenkrämpfe der letzten 4 Wochen für das Raster: stärkste Intensität je Tag
  const loadMuscle = useCallback(async () => {
    const sb = supabase();
    if (!sb || !feat.muskeln) return;
    const { data } = await sb.from("muscle_events").select("day, intensity").gte("day", isoDay(daysAgo(DAYS - 1)));
    const m = new Map<string, number>();
    for (const r of (data ?? []) as { day: string; intensity: number }[]) m.set(r.day, Math.max(m.get(r.day) ?? 0, r.intensity));
    setMuscle(m);
  }, [feat.muskeln]);

  useEffect(() => {
    loadMuscle();
  }, [loadMuscle]);

  const changed = () => {
    setSaved(false);
    setDirty(true);
  };
  const setSauna = (patch: Partial<SaunaDetails>) => {
    setDetails((d) => ({ ...d, sauna: { ...(d.sauna ?? {}), ...patch } }));
    changed();
  };
  // Tag wechseln: ungespeicherte Änderungen nicht still verwerfen
  const go = (d: string) => {
    if (d === day || d > today) return;
    if (dirty && !window.confirm("Deine Änderungen für diesen Tag sind noch nicht gespeichert. Trotzdem wechseln?")) return;
    setDay(d);
  };

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    const clean = Object.fromEntries(Object.entries(symptoms).filter(([, v]) => v > 0));
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day, bleeding, symptoms: clean, influences, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (e) {
      setError("Eintrag konnte nicht gespeichert werden: " + e.message);
      return;
    }
    // Details nur für eingetragene Gewohnheiten speichern. Fehlt die Spalte noch, bleibt der Eintrag trotzdem gespeichert.
    const keep: HabitDetails = Object.fromEntries(Object.entries(details).filter(([k]) => influences.includes(k)));
    const d2 = await sb.from("diary_entries").update({ habit_details: keep }).eq("day", day);
    setError("");
    if (ovReady) {
      const o2 = await sb.from("diary_entries").update({ ovulation_signs: ovSigns }).eq("day", day);
      if (o2.error) setError("Eisprung-Zeichen konnten nicht gespeichert werden: " + o2.error.message);
    }
    setDetailsNote(d2.error ? "Die Sauna-Details werden gespeichert, sobald die Datenbank aktualisiert ist (PR mit Migration)." : "");
    setSaved(true);
    setDirty(false);
    load();
  };

  const byDay = new Map(history.map((h) => [h.day, h]));
  const days = Array.from({ length: DAYS }, (_, i) => isoDay(daysAgo(DAYS - 1 - i)));
  const cellColor = (rowKey: string, d: string) => {
    if (rowKey === "wade") return heat[muscle.get(d) ?? 0];
    const e = d === day ? { day: d, bleeding, symptoms, influences } : byDay.get(d);
    if (!e) return "var(--line-soft)";
    if (rowKey === "blut") return e.bleeding > 0 ? "var(--menses-fg)" : "var(--line-soft)";
    return heat[e.symptoms?.[rowKey] ?? 0];
  };

  // Oben die genutzten, Rest unter „Weitere anzeigen“ (Sammelliste 5e)
  const usedSym = new Set<string>([...Object.keys(symptoms).filter((k) => symptoms[k] > 0), ...history.flatMap((e) => Object.keys(e.symptoms ?? {}).filter((k) => (e.symptoms[k] ?? 0) > 0))]);
  const symSplit = splitFrequent(SYMPTOMS, usedSym);
  const usedHab = new Set<string>([...influences, ...history.flatMap((e) => e.influences ?? [])]);
  const habSplit = splitFrequent(habits.filter((h) => h.on || influences.includes(h.key)), usedHab);

  return (
    <>
      <PageHead title="Tagebuch" sub={(day === today ? "Eintrag für " : "Nachtrag für ") + longDate(new Date(day + "T12:00:00"))} />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="day-nav">
        <button type="button" className="btn btn-soft btn-44" aria-label="Vorheriger Tag" onClick={() => go(shift(day, -1))}>‹</button>
        <input type="date" className="input" aria-label="Tag wählen" max={today} value={day} onChange={(e) => e.target.value && go(e.target.value)} />
        <button type="button" className="btn btn-soft btn-44" aria-label="Nächster Tag" disabled={day >= today} onClick={() => go(shift(day, 1))}>›</button>
      </div>
      {day !== today && (
        <button type="button" className="btn btn-link btn-44" onClick={() => go(today)}>Zurück zu heute</button>
      )}

      <CheckinCard key={"c" + day} day={day} isToday={day === today} />

      <section className="card">
        <div className="card-row">
          <h2>Blutung</h2>
          {feat.zyklus && <Link href="/zyklus#perioden" className="settings-link">Frühere nachtragen ›</Link>}
        </div>
        <div className="grid-5">
          {BLEEDING.map((l, i) => (
            <button key={l} type="button" className="pill pill-box" aria-pressed={bleeding === i} onClick={() => { setBleeding(i); changed(); }}>
              {l}
            </button>
          ))}
        </div>
        {feat.zyklus && ovReady && (
          <>
            <span className="meta ov-label">Eisprung-Zeichen (wenn du eines bemerkst)</span>
            <div className="pills wrap">
              {OVULATION_SIGNS.map((o) => {
                const on = ovSigns.includes(o.key);
                return (
                  <button key={o.key} type="button" className="pill" aria-pressed={on} onClick={() => { setOvSigns(on ? ovSigns.filter((x) => x !== o.key) : [...ovSigns, o.key]); changed(); }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-row">
          <h2>Symptome</h2>
          <span className="meta">Tippen: leicht, mittel, stark</span>
        </div>
        <div className="pills wrap">
          {[...symSplit.top, ...(moreSym ? symSplit.rest : [])].map((s) => {
            const v = symptoms[s.key] ?? 0;
            return (
              <button
                key={s.key}
                type="button"
                className={"pill level-" + v}
                onClick={() => { setSymptoms({ ...symptoms, [s.key]: (v + 1) % 4 }); changed(); }}
              >
                {s.label}{v ? " · " + LEVELS[v] : ""}
              </button>
            );
          })}
        </div>
        {symSplit.rest.length > 0 && (
          <button type="button" className="btn btn-link more-link" onClick={() => setMoreSym(!moreSym)} aria-expanded={moreSym}>
            {moreSym ? "Weniger anzeigen" : `Weitere anzeigen (${symSplit.rest.length})`}
          </button>
        )}
      </section>

      {feat.perimenopause && <FlashCounter key={"f" + day} day={day} />}

      <section className="card">
        <div className="card-row">
          <h2>Gewohnheiten</h2>
          <Link href="/einstellungen/gewohnheiten" className="settings-link">Verwalten ›</Link>
        </div>
        <div className="pills wrap">
          {[...habSplit.top, ...(moreHab ? habSplit.rest : [])].map((f) => {
              const on = influences.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  className="pill"
                  aria-pressed={on}
                  onClick={() => { setInfluences(on ? influences.filter((x) => x !== f.key) : [...influences, f.key]); changed(); }}
                >
                  {f.label}
                </button>
              );
            })}
        </div>
        {habSplit.rest.length > 0 && (
          <button type="button" className="btn btn-link more-link" onClick={() => setMoreHab(!moreHab)} aria-expanded={moreHab}>
            {moreHab ? "Weniger anzeigen" : `Weitere anzeigen (${habSplit.rest.length})`}
          </button>
        )}
        {influences.includes("sauna") && (
          <div className="habit-detail">
            <span className="row-strong">Sauna · Details (freiwillig)</span>
            <span className="meta">Gänge</span>
            <div className="choice-row choice-4">
              {SAUNA_GAENGE.map((g) => (
                <button key={g} type="button" className="choice" aria-pressed={details.sauna?.gaenge === g} onClick={() => { setSauna({ gaenge: details.sauna?.gaenge === g ? undefined : g }); }}>
                  {g}
                </button>
              ))}
            </div>
            <span className="meta">Wann</span>
            <div className="choice-row choice-3">
              {SAUNA_WANN.map((w) => (
                <button key={w} type="button" className="choice" aria-pressed={details.sauna?.wann === w} onClick={() => { setSauna({ wann: details.sauna?.wann === w ? undefined : w }); }}>
                  {WANN_LABEL[w]}
                </button>
              ))}
            </div>
            <button type="button" className="choice choice-wide" aria-pressed={!!details.sauna?.kaeltebecken} onClick={() => setSauna({ kaeltebecken: !details.sauna?.kaeltebecken })}>
              Danach Kältebecken
            </button>
          </div>
        )}
        {detailsNote && <span className="meta">{detailsNote}</span>}
        <span className="meta">Ein Tipp genügt. Die Auswertung findest du unter Gesundheit.</span>
      </section>

      <button type="button" className="btn btn-primary" onClick={save} disabled={saved}>
        {saved ? "Gespeichert" : day === today ? "Eintrag speichern" : "Nachtrag speichern"}
      </button>

      <DayIntakes key={"i" + day} day={day} />

      {feat.muskeln && <MuscleSection key={"m" + day} day={day} onChanged={loadMuscle} />}

      <section className="card">
        <details className="derive">
        <summary>Verlauf, 4 Wochen · {shortDate(daysAgo(DAYS - 1))} bis heute</summary>
          {[...GRID_ROWS, ...(feat.muskeln ? [{ key: "wade", label: "Wade" }] : [])].map((r) => (
            <div key={r.key} className="grid-row">
              <span className="grid-label">{r.label}</span>
              <div className="grid-28" aria-label={r.label + " der letzten 4 Wochen"}>
                {days.map((d) => (
                  <span key={d} className="grid-cell" data-selected={d === day} style={{ background: cellColor(r.key, d) }} />
                ))}
              </div>
            </div>
          ))}
          <div className="legend">
            <span><i style={{ background: heat[1] }} />leicht</span>
            <span><i style={{ background: heat[2] }} />mittel</span>
            <span><i style={{ background: heat[3] }} />stark</span>
            <span><i style={{ background: "var(--menses-fg)" }} />Periode</span>
          </div>
          {feat.muskeln && <span className="meta">Wade: leicht Zucken, mittel Krampf, stark starker Krampf</span>}
          {history.length === 0 && <p>Sobald du Einträge machst, füllt sich das Raster.</p>}
        </details>
      </section>
    </>
  );
}
