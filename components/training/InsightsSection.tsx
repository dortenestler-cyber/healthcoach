"use client";

import { Details } from "@/components/ui/Pille";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { durationText } from "@/lib/garmin";
import type { Data, Pattern } from "@/lib/insights";
import { useRefresh } from "@/lib/refresh";
import { SPORTS, sportOf, type Sport } from "@/lib/training";
import { sportSummary, trainingPatterns, unitDay, type Unit } from "@/lib/trainingInsights";
import SportIcon from "@/components/ui/SportIcon";

const ORDER: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer"];
const shortDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });

// Insights (Konzept Training-Insights, Ebenen 2 und 3): Verlauf je Sportart und Muster über alle Einheiten.
// Lädt die Einheiten mit allen Spalten (auch Anstrengung), fehlt eine Spalte noch, bleibt sie leer.
export default function InsightsSection({ data }: { data: Data | null }) {
  const [acts, setActs] = useState<Unit[] | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data: rows } = await sb.from("garmin_activities").select("*").gte("start_local", isoDay(daysAgo(364))).order("start_local");
    setActs((rows ?? []) as Unit[]);
  }, []);
  useRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  const today = isoDay();
  const present = acts ? ORDER.filter((s) => acts.some((a) => sportOf(a) === s)) : [];
  const shown = sport && present.includes(sport) ? sport : present[0] ?? null;

  return (
    <>
      {acts && !present.length && <p className="meta">Sobald Garmin-Einheiten da sind, erscheinen hier Verläufe und Muster.</p>}
      {present.length > 0 && (
        <div className="pills insight-sports" role="group" aria-label="Sportart">
          {present.map((s) => (
            <button key={s} type="button" className="pill" aria-pressed={shown === s} onClick={() => setSport(s)}>
              {SPORTS[s].label}
            </button>
          ))}
        </div>
      )}
      {acts && shown && <SportCard sport={shown} acts={acts} today={today} />}
      {data && <PatternsCard patterns={trainingPatterns(data)} />}
    </>
  );
}

function SportCard({ sport, acts, today }: { sport: Sport; acts: Unit[]; today: string }) {
  const s = sportSummary(sport, acts, today);
  const label = SPORTS[sport].label;
  const recent = [...s.units].reverse().slice(0, 5);
  return (
    <section className="card">
      <span className="eyebrow">{label}</span>
      <h3 className="card-title-lg unit-sentence">{s.sentence}</h3>
      {s.units.length >= 2 && <SportChart units={s.units} label={label} />}
      <div className="unit-tiles">
        <div className="unit-tile">
          <span className="meta">Pro Woche</span>
          <span className="unit-tile-value">{s.perWeek.toLocaleString("de-DE", { maximumFractionDigits: 1 })}<small> ×</small></span>
          <span className="unit-tile-note">letzte 8 Wochen</span>
        </div>
        <div className="unit-tile">
          <span className="meta">Dauer Ø</span>
          <span className="unit-tile-value">{s.avgDuration ? durationText(s.avgDuration) : "–"}</span>
          <span className="unit-tile-note">letzte {s.units.length} Einheiten</span>
        </div>
        {s.rpeN > 0 && (
          <div className="unit-tile">
            <span className="meta">Gefühlt Ø</span>
            <span className="unit-tile-value">{(s.avgRpe as number).toLocaleString("de-DE", { maximumFractionDigits: 1 })}<small> von 10</small></span>
            <span className="unit-tile-note">aus {s.rpeN} Einheiten</span>
          </div>
        )}
      </div>
      <div className="factor-list">
        {recent.map((u) => (
          <Link key={u.activity_id} href={`/training/einheit/${u.activity_id}`} className="card-row list-line unit-link">
            <span className="row-strong">
              <SportIcon sport={sport} size={16} /> {shortDay(unitDay(u))}
            </span>
            <span className="meta">
              {[durationText(u.duration_s), u.avg_hr ? `Puls Ø ${u.avg_hr}` : "", u.training_load ? `Belastung ${Math.round(u.training_load)}` : ""].filter(Boolean).join(" · ")}
              <span className="row-chev" aria-hidden="true">›</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const W = 320;
const H = 170;
const L = 30;
const R = 30;
const T = 12;
const B = 22;

// Belastung je Einheit als Balken, Puls Ø als Linie (rechte Achse). Die letzte Einheit ist hell. Antippen öffnet die Einheit.
function SportChart({ units, label }: { units: Unit[]; label: string }) {
  const router = useRouter();
  const n = units.length;
  const loads = units.map((u) => u.training_load ?? 0);
  const maxLoad = Math.max(20, ...loads);
  const top = Math.ceil(maxLoad / 20) * 20;
  const hrs = units.map((u) => u.avg_hr).filter((v): v is number => !!v);
  const hrLo = hrs.length ? Math.floor((Math.min(...hrs) - 10) / 10) * 10 : 60;
  const hrHi = hrs.length ? Math.ceil((Math.max(...hrs) + 5) / 10) * 10 : 180;
  const bw = (W - L - R) / n;
  const yL = (v: number) => H - B - (v / top) * (H - B - T);
  const yH = (v: number) => H - B - ((v - hrLo) / Math.max(1, hrHi - hrLo)) * (H - B - T);
  const pts = units.map((u, i) => (u.avg_hr ? `${(L + (i + 0.5) * bw).toFixed(1)},${yH(u.avg_hr).toFixed(1)}` : null)).filter(Boolean).join(" ");
  const lastHr = units[n - 1].avg_hr;
  const labelsAt = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
  return (
    <>
      <svg className="sport-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: Belastung und Puls Ø der letzten ${n} Einheiten`}>
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={yL(v)} y2={yL(v)} className="sc-grid" />
            <text x={L - 4} y={yL(v) + 3} textAnchor="end" className="sc-axis">{Math.round(v)}</text>
          </g>
        ))}
        {[hrLo, hrHi].map((v) => (
          <text key={"h" + v} x={W - R + 4} y={yH(v) + 3} className="sc-axis">{v}</text>
        ))}
        {units.map((u, i) =>
          u.training_load ? (
            <rect key={u.activity_id} x={L + i * bw + 2} width={Math.max(2, bw - 4)} y={yL(u.training_load)} height={H - B - yL(u.training_load)} rx={Math.min(5, bw / 4)} className={i === n - 1 ? "sc-bar-last" : "sc-bar"} />
          ) : null,
        )}
        {pts && <polyline points={pts} className="sc-line" />}
        {lastHr && <circle cx={L + (n - 0.5) * bw} cy={yH(lastHr)} r={4} className="sc-dot" />}
        {labelsAt.map((i) => (
          <text key={"d" + i} x={L + (i + 0.5) * bw} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="sc-axis">
            {shortDay(unitDay(units[i]))}
          </text>
        ))}
        {units.map((u, i) => (
          <rect key={"x" + u.activity_id} x={L + i * bw} width={bw} y={T} height={H - B - T} className="sc-hit" onClick={() => router.push(`/training/einheit/${u.activity_id}`)}>
            <title>{`${shortDay(unitDay(u))}: Belastung ${u.training_load ? Math.round(u.training_load) : "–"}, Puls Ø ${u.avg_hr ?? "–"}`}</title>
          </rect>
        ))}
      </svg>
    </>
  );
}

function PatternsCard({ patterns }: { patterns: Pattern[] }) {
  return (
    <section className="card">
      <span className="eyebrow">Muster über alle Einheiten</span>
      {patterns.map((p) => (
        <div key={p.key} className="pattern-block">
          <span className="eyebrow pattern-title">{p.title}</span>
          <span className={p.ready ? "pattern-text" : "meta"}>{p.ready ? p.text : p.need}</span>
          {p.ready && (
            <Details id={`insights.${p.key}`} label="Balken und Grundlage">
          {p.bars.length > 0 && (
            <div className="pattern-bars">
              {(() => {
                const max = Math.max(...p.bars.map((b) => Math.abs(b.value)), 1);
                return p.bars.map((b) => (
                  <div key={b.label} className="pattern-bar">
                    <span className="meta">{b.label}</span>
                    <span className="pattern-track"><span className={b.highlight ? "pattern-fill pattern-hi-training" : "pattern-fill"} style={{ width: `${(Math.abs(b.value) / max) * 100}%` }} /></span>
                    <strong>{b.display}</strong>
                  </div>
                ));
              })()}
            </div>
          )}
          {<span className="meta">Grundlage: {p.basis}. Ein Zusammenhang, kein Beweis.</span>}
            </Details>
          )}
        </div>
      ))}
    </section>
  );
}
