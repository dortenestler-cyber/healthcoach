"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ExplainCard from "@/components/ui/ExplainCard";
import SportIcon from "@/components/ui/SportIcon";
import { supabase } from "@/lib/supabase";
import { isoDay, longDate } from "@/lib/dates";
import { activityLabel, durationText, distanceText } from "@/lib/garmin";
import type { Data } from "@/lib/insights";
import { loadInsightData } from "@/lib/insightData";
import { announceNewData, useRefresh } from "@/lib/refresh";
import { SPORTS, sportOf, sportOfGarmin, type Sport } from "@/lib/training";
import {
  afterUnit,
  clockOf,
  compareUnit,
  diffNote,
  SERIES_STEP,
  startMinute,
  timeline,
  unitCycle,
  unitDay,
  ZONE_NAMES,
  zoneSummary,
  type Timeline,
  type Unit,
} from "@/lib/trainingInsights";

// Einheit im Detail (Konzept Training-Insights, Ebene 1): Ergebnissatz, Kacheln mit Vergleich,
// eigene Anstrengung, Pulszonen, Zeitstrahl, Morgen danach, Zyklus.
export default function UnitDetail({ id }: { id: string }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    try {
      const [u, d] = await Promise.all([sb.from("garmin_activities").select("*").eq("activity_id", id).maybeSingle(), loadInsightData()]);
      if (u.error) throw new Error(u.error.message);
      if (!u.data) setMissing(true);
      else setUnit(u.data as Unit);
      if (d) setData(d);
    } catch (e) {
      setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [id]);
  useRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  const today = isoDay();
  const sport = unit ? sportOf(unit) : null;
  const sm = unit ? startMinute(unit) : null;

  return (
    <>
      <header className="detail-head">
        <div className="page-glow" data-tone="training" aria-hidden="true" />
        <div className="detail-head-row">
          <Link href="/training" className="detail-back" aria-label="Zurück zu Training">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="detail-title">Einheit</h1>
          <span className="detail-back" aria-hidden="true" />
        </div>
        {unit && <p className="detail-day">{longDate(new Date(unitDay(unit) + "T12:00:00"))}{sm !== null ? ` · ${clockOf(sm)}` : ""}</p>}
      </header>

      {error && <p className="alert" role="alert">{error}</p>}
      {missing && <p className="meta">Diese Einheit gibt es nicht mehr.</p>}
      {!unit && !missing && !error && <p className="meta">Lädt …</p>}

      {unit && sport && (
        <div className="unit-hero">
          <span className="today-act-icon is-training" aria-hidden="true">
            <SportIcon sport={sport} size={22} />
          </span>
          <h2 className="unit-title">{sport === "sonstiges" ? activityLabel(unit) : SPORTS[sport].label}</h2>
          <span className="meta">{[durationText(unit.duration_s), distanceText(unit.distance_m), "Garmin"].filter(Boolean).join(" · ")}</span>
          <SportPicker unit={unit} onSaved={(o, l) => { setUnit({ ...unit, sport_override: o, sport_label: l }); load(); }} />
        </div>
      )}

      {unit && data && <ResultCard unit={unit} data={data} />}
      {unit && <RpeCard unit={unit} onSaved={(rpe) => setUnit({ ...unit, rpe })} />}
      {unit && <ZonesCard unit={unit} />}
      {unit && <TimelineCard t={timeline(unit, data)} />}
      {unit && data && <AfterCard unit={unit} data={data} today={today} />}
    </>
  );
}

const CHOICES: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];

// Sportart der Einheit ändern (wie die Frage auf Heute, Sammelliste Punkt 6): eigene Zuordnung vor der Garmin-Sportart.
// Bei „Sonstiges“ ohne eigene Zuordnung ist die Auswahl gleich offen.
function SportPicker({ unit, onSaved }: { unit: Unit; onSaved: (override: string | null, label: string | null) => void }) {
  const unassigned = !unit.sport_override && sportOfGarmin(unit.type_key) === "sonstiges";
  const [open, setOpen] = useState(unassigned);
  const [own, setOwn] = useState(false);
  const [name, setName] = useState(unit.sport_label ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const current = unit.sport_override ?? null;
  const save = async (override: string | null, label: string | null) => {
    const sb = supabase();
    if (!sb || busy) return;
    setBusy(true);
    const { error } = await sb.from("garmin_activities").update({ sport_override: override, sport_label: label }).eq("activity_id", unit.activity_id);
    setBusy(false);
    if (error) {
      setMsg(/sport_/.test(error.message) ? "Die Datenbank kennt die eigene Sportart noch nicht. Sie kommt mit dem nächsten Update." : "Das hat nicht geklappt: " + error.message);
      return;
    }
    setMsg("");
    setOwn(false);
    setOpen(false);
    onSaved(override, label);
    announceNewData();
  };
  if (!open) {
    return (
      <button type="button" className="btn btn-link unit-sport-change" onClick={() => setOpen(true)}>
        Sportart ändern
      </button>
    );
  }
  return (
    <div className="unit-sport-picker">
      <span className="meta">{unassigned ? "Garmin kennt die Sportart nicht. Was war das?" : "Welche Sportart war das?"}</span>
      {own ? (
        <form className="act-q-own" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save("sonstiges", name.trim().slice(0, 40)); }}>
          <input id="unit-own-sport" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Yoga, Tanzen" aria-label="Eigener Name" autoFocus maxLength={40} />
          <button type="submit" className="btn btn-primary btn-44" disabled={busy || !name.trim()}>Speichern</button>
        </form>
      ) : (
        <div className="pills wrap unit-sport-pills" role="group" aria-label="Sportart wählen">
          {CHOICES.map((sp) => (
            <button key={sp} type="button" className="pill" aria-pressed={current === sp} disabled={busy} onClick={() => save(sp, null)}>
              {SPORTS[sp].label}
            </button>
          ))}
          <button type="button" className="pill" aria-pressed={current === "sonstiges"} disabled={busy} onClick={() => setOwn(true)}>Anderes …</button>
          <button type="button" className="pill pill-quiet" aria-pressed={current === "ignorieren"} disabled={busy} onClick={() => save("ignorieren", null)}>Nicht zuordnen</button>
          {current && <button type="button" className="pill pill-quiet" disabled={busy} onClick={() => save(null, null)}>Wie bei Garmin</button>}
          {!unassigned && <button type="button" className="btn btn-link" onClick={() => setOpen(false)}>Abbrechen</button>}
        </div>
      )}
      {msg && <p className="meta-warn" role="alert">{msg}</p>}
    </div>
  );
}

function ResultCard({ unit, data }: { unit: Unit; data: Data }) {
  const c = compareUnit(unit, data.acts);
  const dur = (v: number) => durationText(v);
  const durNote = unit.duration_s && c.duration ? (Math.abs(unit.duration_s - c.duration) < 300 ? "wie üblich" : `üblich ${dur(c.duration)}`) : "";
  const tone = c.verdict === "härter" ? "training" : "recovery";
  return (
    <section className="card detail-card">
      <span className="eyebrow">Ergebnis</span>
      <h3 className="card-title-lg unit-sentence">{c.sentence}</h3>
      <div className="unit-tiles">
        <Tile label="Dauer" value={durationText(unit.duration_s) || "–"} note={durNote} />
        <Tile label="Puls Ø" value={unit.avg_hr ? `${unit.avg_hr}` : "–"} unit="bpm" note={diffNote(unit.avg_hr, c.avgHr, "", undefined, 2)} />
        <Tile label="Puls max" value={unit.max_hr ? `${unit.max_hr}` : "–"} unit="bpm" note={diffNote(unit.max_hr, c.maxHr, "", undefined, 3)} />
        <Tile label="Belastung" value={unit.training_load ? `${Math.round(unit.training_load)}` : "–"} note={unit.training_load && c.load ? `üblich ${Math.round(c.load)}` : ""} />
      </div>
      {c.n > 0 && <span className="meta">Vergleich mit deinen letzten {c.n} Einheiten dieser Sportart. Belastung wie bei Garmin.</span>}
      {unit.rpe && unit.training_load && c.verdict && (
        <ExplainCard tone={tone}>
          Gefühlt <strong>{unit.rpe} von 10</strong>, laut Garmin <strong>{c.verdict === "üblich" ? "eine übliche Belastung" : c.verdict === "härter" ? "mehr Belastung als üblich" : "weniger Belastung als üblich"}</strong>.
        </ExplainCard>
      )}
    </section>
  );
}

function Tile({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <div className="unit-tile">
      <span className="meta">{label}</span>
      <span className="unit-tile-value">
        {value}
        {unit && value !== "–" && <small> {unit}</small>}
      </span>
      {note && <span className="unit-tile-note">{note}</span>}
    </div>
  );
}

const RPE_WORDS: Record<number, string> = { 1: "sehr leicht", 3: "leicht", 5: "mittel", 7: "schwer", 9: "sehr schwer", 10: "maximal" };

function RpeCard({ unit, onSaved }: { unit: Unit; onSaved: (rpe: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = async (v: number) => {
    const sb = supabase();
    if (!sb) return;
    const next = unit.rpe === v ? null : v;
    setBusy(true);
    setMsg("");
    const { error } = await sb.from("garmin_activities").update({ rpe: next }).eq("activity_id", unit.activity_id);
    setBusy(false);
    if (error) {
      setMsg(/rpe/.test(error.message) ? "Die Datenbank kennt die Anstrengung noch nicht. Sie kommt mit dem nächsten Update." : "Nicht gespeichert: " + error.message);
      return;
    }
    onSaved(next);
    announceNewData();
  };
  const v = unit.rpe ?? null;
  return (
    <section className="card detail-card">
      <span className="eyebrow">Wie anstrengend fühlte es sich an?</span>
      <div className="rpe-row" role="group" aria-label="Anstrengung von 1 bis 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className="rpe-btn" aria-pressed={v === n} disabled={busy} onClick={() => save(n)}>
            {n}
          </button>
        ))}
      </div>
      <span className="meta">
        {v ? `${v} von 10${RPE_WORDS[v] ? ", " + RPE_WORDS[v] : ""}. Nochmal tippen entfernt den Wert.` : "1 sehr leicht · 5 mittel · 10 maximal"}
      </span>
      {msg && <p className="meta-warn" role="alert">{msg}</p>}
    </section>
  );
}

function ZonesCard({ unit }: { unit: Unit }) {
  const z = zoneSummary(unit);
  if (!z) return null;
  return (
    <section className="card detail-card">
      <span className="eyebrow">Pulszonen</span>
      <h3 className="card-title-lg unit-sentence">{z.sentence}</h3>
      <div className="zone-bar" role="img" aria-label={z.minutes.map((m, i) => `${ZONE_NAMES[i]} ${Math.round(m)} Minuten`).join(", ")}>
        {z.minutes.map((m, i) => (m > 0 ? <span key={i} className={`zone-seg zone-bg-${i}`} style={{ flexGrow: m }} /> : null))}
      </div>
      <div className="zone-legend">
        {z.minutes.map((m, i) => (
          <span key={i}>
            <i className={`zone-key zone-bg-${i}`} aria-hidden="true" />
            {i === 0 ? "Ruhe" : `Z${i} ${ZONE_NAMES[i]}`}
            <b>{Math.round(m)} min</b>
          </span>
        ))}
      </div>
      <span className="meta">Zonen zwischen deinem Ruhepuls und Maximalpuls, wie bei der Belastung. Mehr ist heller.</span>
    </section>
  );
}

const W = 320;
const H = 190;
const L = 30;
const R = 34;
const T = 26;
const B = 22;

// Zwei Werte, zwei Achsen: Balken = Puls (links, bpm), Linie = Belastung bis zu diesem Zeitpunkt (rechts, 0 bis Summe).
function TimelineCard({ t }: { t: Timeline | null }) {
  const [pick, setPick] = useState<number | null>(null);
  if (!t) {
    return (
      <section className="card detail-card">
        <span className="eyebrow">Zeitstrahl</span>
        <p className="meta">Den Pulsverlauf dieser Einheit berechnet die App aus dem Tagespuls von Garmin. Er erscheint nach dem nächsten Abruf, für ältere Einheiten nach „Ein Jahr laden“ im Verlauf.</p>
      </section>
    );
  }
  const n = t.segs.length;
  const hrs = t.segs.map((s) => s.hr).filter((v): v is number => v !== null);
  const lo = Math.max(40, Math.floor((Math.min(...hrs) - 10) / 20) * 20);
  const hi = Math.ceil((Math.max(...hrs) + 5) / 20) * 20;
  const bw = (W - L - R) / n;
  const bottom = H - B;
  const yHr = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - T);
  const yCum = (v: number) => bottom - (t.total ? (v / t.total) * (bottom - T) : 0);
  const ticks = [lo, (lo + hi) / 2, hi];
  const total = Math.round(t.total);
  const end = t.segs[n - 1].from + SERIES_STEP;
  const sel = pick !== null ? t.segs[pick] : null;
  const line = [`${L},${bottom}`, ...t.segs.map((s, i) => `${(L + (i + 1) * bw).toFixed(1)},${yCum(s.cum).toFixed(1)}`)].join(" ");
  const peakX = t.peak ? L + ((t.peak.from - t.segs[0].from) / SERIES_STEP) * bw : 0;
  const peakW = t.peak ? ((t.peak.to - t.peak.from) / SERIES_STEP) * bw : 0;
  return (
    <section className="card detail-card">
      <span className="eyebrow">Zeitstrahl</span>
      <h3 className="card-title-lg unit-sentence">{t.sentence}</h3>
      <div className="tl-legend" aria-hidden="true">
        <span><i className="tl-key-bar" /> Puls je {SERIES_STEP} Min (links, bpm)</span>
        <span><i className="tl-key-line" /> Belastung bis dahin (rechts)</span>
      </div>
      <svg className="unit-timeline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Puls je ${SERIES_STEP} Minuten in bpm und aufgebaute Belastung von 0 bis ${total}. ${t.sentence}`}>
        {t.peak && (
          <g>
            <rect x={peakX} width={peakW} y={T - 4} height={bottom - T + 4} className="tl-peak" />
            <text x={peakX + peakW / 2} y={T - 9} textAnchor="middle" className="tl-peak-label">härteste 25 Min</text>
          </g>
        )}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={yHr(v)} y2={yHr(v)} className="tl-grid" />
            <text x={L - 4} y={yHr(v) + 3} textAnchor="end" className="tl-axis">{Math.round(v)}</text>
          </g>
        ))}
        {[0, total].map((v) => (
          <text key={"r" + v} x={W - R + 6} y={yCum(v) + 3} className="tl-axis tl-axis-load">{v}</text>
        ))}
        {t.segs.map((s, i) =>
          s.hr === null ? null : (
            <rect key={i} x={L + i * bw + 0.75} width={Math.max(1, bw - 1.5)} y={yHr(s.hr)} height={bottom - yHr(s.hr)} rx={Math.min(3, bw / 3)} className={`zone-fill-${s.zone ?? 0}${pick === i ? " tl-picked" : ""}`} />
          ),
        )}
        <polyline points={line} className="tl-cum" />
        <circle cx={W - R} cy={yCum(t.segs[n - 1].cum)} r={3.5} className="tl-cum-dot" />
        <text x={L} y={H - 6} textAnchor="start" className="tl-axis">{clockOf(t.segs[0].from)}</text>
        <text x={L + (W - L - R) / 2} y={H - 6} textAnchor="middle" className="tl-axis">{clockOf((t.segs[0].from + end) / 2)}</text>
        <text x={W - R} y={H - 6} textAnchor="end" className="tl-axis">{clockOf(end)}</text>
        {t.segs.map((s, i) => (
          <rect key={"h" + i} x={L + i * bw} width={bw} y={T} height={bottom - T} className="tl-hit" onClick={() => setPick(pick === i ? null : i)} onMouseEnter={() => setPick(i)}>
            <title>{`${clockOf(s.from)}: ${s.hr ? s.hr + " bpm" : "keine Messung"}`}</title>
          </rect>
        ))}
      </svg>
      <p className="meta tl-readout" aria-live="polite">
        {sel
          ? `${clockOf(sel.from)}–${clockOf(sel.from + SERIES_STEP)}: ${sel.hr ? `Puls ${sel.hr} bpm, ${sel.zone ? "Zone " + sel.zone + " " + ZONE_NAMES[sel.zone] : "Ruhe"}` : "keine Messung"} · Belastung bis hier ${Math.round(sel.cum)} von ${total}`
          : "Tipp auf eine Stelle zeigt Uhrzeit, Puls und Belastung bis dahin."}
      </p>
      <span className="meta">
        Je höher der Puls, desto steiler steigt die Linie. Sie endet bei {total}
        {t.usesGarmin ? ", der Garmin-Belastung der Einheit. Wie sie sich über die Zeit verteilt, schätzt die App aus den Pulszonen." : " Pulspunkten, Garmin hat für diese Einheit keine Belastung geliefert."}
      </span>
    </section>
  );
}

function AfterCard({ unit, data, today }: { unit: Unit; data: Data; today: string }) {
  const a = afterUnit(unit, data, today);
  const cyc = unitCycle(unit, data);
  return (
    <section className="card detail-card">
      <span className="eyebrow">Danach</span>
      <h3 className="card-title-lg unit-sentence">{a.sentence}</h3>
      {a.rows.length > 0 && (
        <div className="factor-list">
          {a.rows.map((r) => (
            <div key={r.key} className="card-row list-line">
              <span>{r.label}</span>
              <span className="unit-after-value">
                <strong>{r.value}</strong>
                {r.range && (
                  <span className={`chip-sm ${r.pos === "im" ? "chip-ok" : "chip-muted"}`}>
                    {r.pos ? `${r.pos === "im" ? "im Bereich" : r.pos === "unter" ? "unter" : "über"} ${r.range}` : r.range}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {cyc && (
        <div className="card-row list-line">
          <span>Zyklus am Trainingstag</span>
          <span className="chip-sm chip-cycle">{cyc}</span>
        </div>
      )}
      {!a.pending && <span className="meta">Werte vom Morgen nach der Einheit, gegen deinen Bereich (zyklusabhängige Werte gegen dieselbe Phase).</span>}
    </section>
  );
}
