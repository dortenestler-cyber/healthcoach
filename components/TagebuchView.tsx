"use client";

import Link from "next/link";
import TwoCol from "@/components/ui/TwoCol";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate } from "@/lib/dates";
import { BLEEDING, LEVELS, PHASE_SYMPTOME, SIGNS, splitFrequent, SYMPTOMS } from "@/lib/catalog";
import { cycleToday, PHASES } from "@/lib/cycle";
import { symptomeUmTag } from "@/lib/zyklusAuswertung";
import { loadGarminCycles, mergeGarminCycles } from "@/lib/garminZyklus";
import { loadOvulation, withOvulation } from "@/lib/ovulation";
import { markAutoRows, type Diary } from "@/lib/insights";
import { OVULATION_SIGNS } from "@/lib/ovulation";
import { DEFAULT_HABITS, loadHabits, SAUNA_GAENGE, SAUNA_WANN, WANN_LABEL, type Habit, type HabitDetails, type SaunaDetails } from "@/lib/habits";
import PageHead from "@/components/PageHead";
import CheckinCard from "@/components/tagebuch/CheckinCard";
import AbschlussCard from "@/components/tagebuch/AbschlussCard";
import DayIntakes from "@/components/tagebuch/DayIntakes";
import FlashCounter from "@/components/tagebuch/FlashCounter";
import MuscleSection from "@/components/tagebuch/MuscleSection";
import { useFeatures } from "@/lib/prefs";
import EditSheet from "@/components/ui/EditSheet";
import Monatskalender from "@/components/kalender/Monatskalender";

type Entry = { day: string; bleeding: number; symptoms: Record<string, number>; influences: string[] };

const DAYS = 28; // letzte 4 Wochen: welche Symptome und Gewohnheiten oben stehen

const shift = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Tagebuch für heute oder einen vergangenen Tag: Check-in, Blutung, Symptome mit Hitzewallungen, Gewohnheiten, Einnahmen.
// Speichert jeden Tipp von selbst (Konzept docs/konzept-einfach.md, Paket 7, Logbuch 25.11.), ohne Knopf.
// Hier wird alles eingetragen; Heute zeigt nur, was offen ist. Vergangene Perioden trägst du auf der Seite Zyklus nach.
// Dazu vergangene Perioden schnell nachtragen.
export default function TagebuchView({ initial, abschluss }: { initial?: string; abschluss?: boolean }) {
  const today = isoDay();
  // Tagesabschluss: über die Mitteilung am Abend oder heute ab 18 Uhr
  const [evening, setEvening] = useState(!!abschluss);
  useEffect(() => {
    if (new Date().getHours() >= 18) setEvening(true);
    if (abschluss) setTimeout(() => document.getElementById("abschluss")?.scrollIntoView({ block: "start" }), 300);
  }, [abschluss]);
  const [day, setDay] = useState(initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) && initial <= today ? initial : today);
  const feat = useFeatures();
  const [bleeding, setBleeding] = useState(0);
  const [symptoms, setSymptoms] = useState<Record<string, number>>({});
  const [influences, setInfluences] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [details, setDetails] = useState<HabitDetails>({});
  const [detailsNote, setDetailsNote] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"" | "speichert" | "gespeichert">("");
  const [dirty, setDirty] = useState(false);
  const [blatt, setBlatt] = useState(false); // Monat als Blatt zum Tag wählen
  const [zDiary, setZDiary] = useState<Diary[] | null>(null); // mit Garmin-Zyklen und Eisprung-Zeichen, für die Phase
  const [ovOffen, setOvOffen] = useState(false);
  const [error, setError] = useState("");
  const [moreSym, setMoreSym] = useState(false);
  const [moreSign, setMoreSign] = useState(false);
  const [ovSigns, setOvSigns] = useState<string[]>([]);
  const [ovReady, setOvReady] = useState(false); // Spalte ovulation_signs vorhanden
  const [moreHab, setMoreHab] = useState(false);
  // Sport und Stress aus Garmin (garmin-sync): gesetzt und von dir abgewählt, erst nach der Migration
  const [autoSet, setAutoSet] = useState<string[]>([]);
  const [autoOff, setAutoOff] = useState<string[]>([]);
  const [autoReady, setAutoReady] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [h, d] = await Promise.all([
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").gte("day", isoDay(daysAgo(200))).order("day"), // gut 6 Monate: Phasen im Blatt und „oft um diesen Zyklustag“
      sb.from("diary_entries").select("day, bleeding, symptoms, influences").eq("day", day).maybeSingle(),
    ]);
    if (h.error || d.error) {
      setError("Tagebuch konnte nicht geladen werden: " + (h.error ?? d.error)?.message);
      return;
    }
    setHistory((h.data ?? []) as Entry[]);
    // Phase wie auf der Seite Zyklus: Tagebuch, Lücken aus Garmin, Eisprung-Zeichen
    Promise.all([loadGarminCycles(sb, isoDay(daysAgo(200))), loadOvulation(sb, isoDay(daysAgo(200)))])
      .then(([gc, ov]) => setZDiary(withOvulation(mergeGarminCycles(markAutoRows(((h.data ?? []) as Entry[]).map((e) => ({ ...e, symptoms: e.symptoms ?? {}, influences: e.influences ?? [] })) as (Diary & { manual?: boolean })[]), gc), ov)))
      .catch(() => setZDiary(null));
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
    const au = await sb.from("diary_entries").select("auto_set, auto_off").eq("day", day).maybeSingle();
    const ad = au.error ? null : (au.data as { auto_set?: string[]; auto_off?: string[] } | null);
    setAutoReady(!au.error);
    setAutoSet(ad?.auto_set ?? []);
    setAutoOff(ad?.auto_off ?? []);
    setStatus("");
    setDirty(false);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => setDirty(true);
  const setSauna = (patch: Partial<SaunaDetails>) => {
    setDetails((d) => ({ ...d, sauna: { ...(d.sauna ?? {}), ...patch } }));
    changed();
  };
  // Tag wechseln: Offenes vorher speichern
  const go = async (d: string) => {
    if (d === day || d > today) return;
    if (dirty) await save();
    setDay(d);
  };

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    if (timer.current) clearTimeout(timer.current);
    setDirty(false);
    setStatus("speichert");
    const clean = Object.fromEntries(Object.entries(symptoms).filter(([, v]) => v > 0));
    const { error: e } = await sb
      .from("diary_entries")
      .upsert({ day, bleeding, symptoms: clean, influences, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
    if (e) {
      setError("Eintrag konnte nicht gespeichert werden: " + e.message);
      setStatus("");
      setDirty(true);
      return;
    }
    // Details nur für eingetragene Gewohnheiten speichern. Fehlt die Spalte noch, bleibt der Eintrag trotzdem gespeichert.
    const keep: HabitDetails = Object.fromEntries(Object.entries(details).filter(([k]) => influences.includes(k)));
    const d2 = await sb.from("diary_entries").update({ habit_details: keep }).eq("day", day);
    setError("");
    if (autoReady) {
      // Gespeichert ist es dein eigener Eintrag; abgewählte Garmin-Gewohnheiten setzt die App für diesen Tag nicht wieder
      const a2 = await sb.from("diary_entries").update({ auto_set: autoSet.filter((k) => influences.includes(k)), auto_off: autoOff, manual: true }).eq("day", day);
      if (a2.error) setError("Garmin-Gewohnheiten konnten nicht gespeichert werden: " + a2.error.message);
    }
    if (ovReady) {
      const o2 = await sb.from("diary_entries").update({ ovulation_signs: ovSigns }).eq("day", day);
      if (o2.error) setError("Eisprung-Zeichen konnten nicht gespeichert werden: " + o2.error.message);
    }
    setDetailsNote(d2.error ? "Die Sauna-Details werden gespeichert, sobald die Datenbank aktualisiert ist (PR mit Migration)." : "");
    setStatus("gespeichert");
    // Nur die Liste der letzten Wochen nachführen, die Auswahl bleibt, wie sie ist (weitere Tipps laufen weiter)
    setHistory((h) => [...h.filter((x) => x.day !== day), { day, bleeding, symptoms: clean, influences }]);
  };

  // Von selbst speichern: kurz nach dem letzten Tipp
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current(), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, bleeding, symptoms, influences, details, ovSigns, autoSet, autoOff]);

  // Oben die genutzten (letzte 4 Wochen)
  const seit = isoDay(daysAgo(DAYS - 1));
  const recent = history.filter((e) => e.day >= seit); // Rest unter „Weitere anzeigen“ (Sammelliste 5e)
  const usedSym = new Set<string>([...Object.keys(symptoms).filter((k) => symptoms[k] > 0), ...recent.flatMap((e) => Object.keys(e.symptoms ?? {}).filter((k) => (e.symptoms[k] ?? 0) > 0))]);
  // Passt zu jetzt (Wunsch der Nutzerin 25.11.): eigene Muster um diesen Zyklustag zuerst, dann typisch für die Phase
  const ct = zDiary ? cycleToday(day, zDiary) : null;
  const eigeneJetzt = ct?.cycleDay ? symptomeUmTag(zDiary!, ct.cycleDay) : [];
  const jetztKeys = [...eigeneJetzt, ...(ct?.phase ? PHASE_SYMPTOME[ct.phase] : []).filter((k) => !eigeneJetzt.includes(k))].filter((k) => SYMPTOMS.some((x) => x.key === k)).slice(0, 6);
  const jetzt = jetztKeys.map((k) => SYMPTOMS.find((x) => x.key === k)!);
  const symSplit = splitFrequent(SYMPTOMS.filter((x) => !jetztKeys.includes(x.key)), usedSym);
  const zeigeEisprung = ct?.phase === "eisprung" || ovSigns.length > 0 || ovOffen;
  const signSplit = splitFrequent(SIGNS, usedSym);
  const usedHab = new Set<string>([...influences, ...recent.flatMap((e) => e.influences ?? [])]);
  const habSplit = splitFrequent(habits.filter((h) => h.on || influences.includes(h.key)), usedHab);

  return (
    <>
      <PageHead title="Tagebuch" kalender="tagebuch" />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="day-nav">
        <button type="button" className="btn btn-soft btn-44" aria-label="Vorheriger Tag" onClick={() => go(shift(day, -1))}>‹</button>
        <button type="button" className="input tb-datum" aria-label={`${longDate(new Date(day + "T12:00:00"))}, anderen Tag wählen`} onClick={() => setBlatt(true)}>
          {longDate(new Date(day + "T12:00:00"))}
        </button>
        <button type="button" className="btn btn-soft btn-44" aria-label="Nächster Tag" disabled={day >= today} onClick={() => go(shift(day, 1))}>›</button>
      </div>
      <div className="tb-status-zeile">
        {day !== today ? (
          <button type="button" className="btn btn-link btn-44" onClick={() => go(today)}>Zurück zu heute</button>
        ) : <span />}
        <span className="meta tb-status" role="status" aria-live="polite">
          {status === "speichert" || dirty ? "Speichert …" : status === "gespeichert" ? "✓ Gespeichert" : ""}
        </span>
      </div>
      <EditSheet title="Tag wählen" open={blatt} onClose={() => setBlatt(false)} instant>
        <Monatskalender
          today={today}
          diary={history}
          ebenen={["zyklus", "symptome"]}
          merken="tagebuch-blatt"
          selected={day}
          maxForward={0}
          onPick={(d) => {
            if (d > today) return;
            setBlatt(false);
            go(d);
          }}
        />
      </EditSheet>

      <TwoCol
        left={
          <>
      {evening && day === today && <AbschlussCard key={"a" + day} day={day} />}
      <CheckinCard key={"c" + day} day={day} isToday={day === today} onSymptoms={load} />

      <section className="card">
        <div className="card-row">
          <h2>Blutung</h2>
          {feat.zyklus && <Link href="/zyklus#perioden" className="settings-link">Frühere nachtragen ›</Link>}
        </div>
        {feat.zyklus && ct?.phase && ct.cycleDay !== null && (
          <span className="meta tb-phase">Zyklustag {ct.cycleDay} · {PHASES[ct.phase].label}{ct.phase === "menstruation" && bleeding > 0 ? "" : " (geschätzt)"}</span>
        )}
        <div className="grid-5 tb-blutung">
          {BLEEDING.map((l, i) => (
            <button key={l} type="button" className="pill pill-sm" aria-pressed={bleeding === i} onClick={() => { setBleeding(i); changed(); }}>
              {l}
            </button>
          ))}
        </div>
        {feat.zyklus && ovReady && !zeigeEisprung && (
          <button type="button" className="pill pill-sm pill-quiet tb-ov-auf" onClick={() => setOvOffen(true)}>
            + Eisprung-Zeichen
          </button>
        )}
        {feat.zyklus && ovReady && zeigeEisprung && (
          <>
            <span className="meta ov-label">Eisprung-Zeichen{ct?.phase === "eisprung" ? " · du bist im Eisprung-Fenster (geschätzt)" : " (wenn du eines bemerkst)"}</span>
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
        </div>
        {jetzt.length > 0 && (
          <>
            <span className="meta tb-jetzt">Passt zu jetzt{ct?.phase ? ` · ${PHASES[ct.phase].label}` : ""}</span>
            <div className="pills wrap">
              {jetzt.map((s) => {
                const v = symptoms[s.key] ?? 0;
                return (
                  <button key={s.key} type="button" className={"pill level-" + v} onClick={() => { setSymptoms({ ...symptoms, [s.key]: (v + 1) % 4 }); changed(); }}>
                    {s.label}{v ? " · " + LEVELS[v] : eigeneJetzt.includes(s.key) ? " · oft" : ""}
                  </button>
                );
              })}
            </div>
            <span className="meta tb-jetzt">Sonst oft</span>
          </>
        )}
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

      {/* Leichte Anzeichen, ohne gleich krank zu sein (Sammelliste Punkt 19) */}
      <section className="card">
        <div className="card-row">
          <h2>Anzeichen</h2>
        </div>
        <div className="pills wrap">
          {[...signSplit.top, ...(moreSign ? signSplit.rest : [])].map((s) => {
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
        {signSplit.rest.length > 0 && (
          <button type="button" className="btn btn-link more-link" onClick={() => setMoreSign(!moreSign)} aria-expanded={moreSign}>
            {moreSign ? "Weniger anzeigen" : `Weitere anzeigen (${signSplit.rest.length})`}
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
              const fromGarmin = on && autoSet.includes(f.key);
              const toggle = () => {
                setInfluences(on ? influences.filter((x) => x !== f.key) : [...influences, f.key]);
                if (on && autoSet.includes(f.key)) {
                  setAutoSet(autoSet.filter((x) => x !== f.key));
                  setAutoOff([...new Set([...autoOff, f.key])]);
                }
                if (!on) setAutoOff(autoOff.filter((x) => x !== f.key));
                changed();
              };
              return (
                <button key={f.key} type="button" className="pill" aria-pressed={on} onClick={toggle}>
                  {f.label}
                  {fromGarmin ? " · aus Garmin" : ""}
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
      </section>

          </>
        }
        right={
          <>
      <DayIntakes key={"i" + day} day={day} />

      {feat.muskeln && <MuscleSection key={"m" + day} day={day} />}

      <Link href="/kalender?von=tagebuch" className="card card-link-row">
        <span className="stack">
          <span className="row-strong">Verlauf im Kalender</span>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
          </>
        }
      />
    </>
  );
}
