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
import { SPORTS, sportOf } from "@/lib/training";
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
const H = 168;
const L = 30;
const R = 8;
const T = 12;
const B = 22;

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
  const yHr = (v: number) => H - B - ((v - lo) / (hi - lo)) * (H - B - T);
  const yCum = (v: number) => H - B - (t.total ? (v / t.total) * (H - B - T) : 0);
  const ticks = [lo, (lo + hi) / 2, hi];
  const labelsAt = [0, Math.floor(n / 2), n - 1];
  const sel = pick !== null ? t.segs[pick] : null;
  const line = t.segs.map((s, i) => `${(L + (i + 0.5) * bw).toFixed(1)},${yCum(s.cum).toFixed(1)}`).join(" ");
  return (
    <section className="card detail-card">
      <span className="eyebrow">Zeitstrahl</span>
      <h3 className="card-title-lg unit-sentence">{t.sentence}</h3>
      <svg className="unit-timeline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Puls je ${SERIES_STEP} Minuten und aufgebaute Belastung. ${t.sentence}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={yHr(v)} y2={yHr(v)} className="tl-grid" />
            <text x={L - 4} y={yHr(v) + 3} textAnchor="end" className="tl-axis">{Math.round(v)}</text>
          </g>
        ))}
        {t.peak && (
          <rect
            x={L + ((t.peak.from - t.segs[0].from) / SERIES_STEP) * bw}
            width={((t.peak.to - t.peak.from) / SERIES_STEP) * bw}
            y={T - 4}
            height={H - B - T + 4}
            className="tl-peak"
          />
        )}
        {t.segs.map((s, i) =>
          s.hr === null ? null : (
            <rect key={i} x={L + i * bw + 0.75} width={Math.max(1, bw - 1.5)} y={yHr(s.hr)} height={H - B - yHr(s.hr)} rx={Math.min(3, bw / 3)} className={`zone-fill-${s.zone ?? 0}${pick === i ? " tl-picked" : ""}`} />
          ),
        )}
        <polyline points={line} className="tl-cum" />
        <circle cx={L + (n - 0.5) * bw} cy={yCum(t.segs[n - 1].cum)} r={3.5} className="tl-cum-dot" />
        {labelsAt.map((i) => (
          <text key={i} x={L + (i + 0.5) * bw} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="tl-axis">
            {clockOf(t.segs[i].from)}
          </text>
        ))}
        {t.segs.map((s, i) => (
          <rect key={"h" + i} x={L + i * bw} width={bw} y={T} height={H - B - T} className="tl-hit" onClick={() => setPick(pick === i ? null : i)} onMouseEnter={() => setPick(i)}>
            <title>{`${clockOf(s.from)}: ${s.hr ? s.hr + " bpm" : "keine Messung"}`}</title>
          </rect>
        ))}
      </svg>
      <p className="meta tl-readout" aria-live="polite">
        {sel
          ? `${clockOf(sel.from)}–${clockOf(sel.from + SERIES_STEP)}: ${sel.hr ? `Puls ${sel.hr} bpm, ${sel.zone ? "Zone " + sel.zone + " " + ZONE_NAMES[sel.zone] : "Ruhe"}` : "keine Messung"} · Belastung bis hier ${Math.round(sel.cum)}`
          : "Tipp auf eine Stelle zeigt Uhrzeit, Puls und Belastung bis dahin."}
      </p>
      <span className="meta">
        Balken: Puls je {SERIES_STEP} Minuten, Farbe nach Zone. Linie: aufgebaute Belastung bis {Math.round(t.total)}.{" "}
        {t.usesGarmin ? "Die Verteilung ist aus den Pulszonen geschätzt, die Summe ist die Garmin-Belastung." : "Ohne Garmin-Belastung in Pulspunkten."}
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
