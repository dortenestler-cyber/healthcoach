"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";

type Row = { day: string; weight_kg: number | null; waist_cm: number | null };
type Mode = "gewicht" | "umfang" | "beide" | "aus";

const MODES: [Mode, string][] = [
  ["gewicht", "Gewicht"],
  ["umfang", "Bauchumfang"],
  ["beide", "Beides"],
  ["aus", "Aus"],
];
const DAYS = 84; // 12 Wochen

// Körperwerte nur als Trend: kein Zielgewicht, keine Abnehm-Funktion
export default function BodySection() {
  const [mode, setMode] = useState<Mode>("gewicht");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [periodDays, setPeriodDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(DAYS - 1));
    const [s, b, d] = await Promise.all([
      sb.from("settings").select("data").maybeSingle(),
      sb.from("body_measurements").select("day, weight_kg, waist_cm").gte("day", from).order("day"),
      sb.from("diary_entries").select("day").gte("day", from).gt("bleeding", 0),
    ]);
    if (b.error) setError("Körperwerte konnten nicht geladen werden: " + b.error.message);
    const data = ((s.data as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    setSettings(data);
    if (typeof data.body === "string") setMode(data.body as Mode);
    setRows(((b.data ?? []) as Row[]).map((r) => ({ ...r, weight_kg: r.weight_kg === null ? null : Number(r.weight_kg), waist_cm: r.waist_cm === null ? null : Number(r.waist_cm) })));
    setPeriodDays(new Set(((d.data ?? []) as { day: string }[]).map((r) => r.day)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const changeMode = async (m: Mode) => {
    setMode(m);
    const next = { ...settings, body: m };
    setSettings(next);
    const { error: e } = await sb.from("settings").upsert({ data: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (e) setError("Einstellung konnte nicht gespeichert werden: " + e.message);
  };

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="pills wrap">
        {MODES.map(([k, l]) => (
          <button key={k} type="button" className="pill pill-sm" aria-pressed={mode === k} onClick={() => changeMode(k)}>
            {l}
          </button>
        ))}
      </div>

      {mode === "aus" && (
        <section className="card">
          <p>Körperwerte sind ausgeschaltet. Du kannst sie oben jederzeit wieder einschalten.</p>
        </section>
      )}
      {(mode === "gewicht" || mode === "beide") && (
        <TrendCard field="weight_kg" label="Gewicht" unit="kg" step={0.1} digits={1} rows={rows} periodDays={periodDays} onSaved={load} onError={setError} />
      )}
      {(mode === "umfang" || mode === "beide") && (
        <TrendCard field="waist_cm" label="Bauchumfang" unit="cm" step={0.5} digits={1} rows={rows} periodDays={periodDays} onSaved={load} onError={setError} />
      )}
      {mode !== "aus" && (
        <section className="card">
          <h2>So geht die App mit deinen Werten um</h2>
          <p>
            Freiwillig und höchstens einmal pro Woche. Die App zeigt den Trend über 4 Wochen, nicht den Tageswert. Wasser vor der Periode kann den Wert ein paar Tage anheben, diese Tage sind markiert. Es gibt kein Zielgewicht und keine Abnehm-Funktion.
          </p>
        </section>
      )}
    </>
  );
}

function TrendCard(props: {
  field: "weight_kg" | "waist_cm";
  label: string;
  unit: string;
  step: number;
  digits: number;
  rows: Row[];
  periodDays: Set<string>;
  onSaved: () => void;
  onError: (s: string) => void;
}) {
  const { field, label, unit, step, digits, rows, periodDays, onSaved, onError } = props;
  const points = rows.filter((r) => r[field] !== null).map((r) => ({ day: r.day, v: r[field] as number }));
  const last = points[points.length - 1];
  const [value, setValue] = useState<number | null>(null);
  const shown = value ?? last?.v ?? (field === "weight_kg" ? 65 : 80);
  const fmt = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " " + unit;

  // Trend: Mittel der letzten 28 Tage gegen die 28 Tage davor
  const avg = (from: number, to: number) => {
    const sel = points.filter((p) => p.day > isoDay(daysAgo(from)) && p.day <= isoDay(daysAgo(to)));
    return sel.length ? sel.reduce((a, b) => a + b.v, 0) / sel.length : null;
  };
  const now = avg(28, 0);
  const before = avg(56, 28);
  const threshold = field === "weight_kg" ? 0.5 : 1.5;
  const verdict = now === null || before === null ? "noch zu wenige Werte" : Math.abs(now - before) < threshold ? "stabil" : now > before ? "leicht steigend" : "leicht sinkend";

  // Diagramm
  const days = Array.from({ length: DAYS }, (_, i) => isoDay(daysAgo(DAYS - 1 - i)));
  const idx = new Map(days.map((d, i) => [d, i]));
  const vals = points.map((p) => p.v);
  const lo = vals.length ? Math.min(...vals) - step * 4 : 0;
  const hi = vals.length ? Math.max(...vals) + step * 4 : 1;
  const x = (i: number) => (i / (DAYS - 1)) * 100;
  const y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;
  const raw = points.map((p) => `${x(idx.get(p.day) ?? 0).toFixed(2)},${y(p.v).toFixed(2)}`).join(" ");
  const trend = points
    .map((p) => {
      const win = points.filter((q) => q.day <= p.day && q.day > isoDay(daysAgo(DAYS - (idx.get(p.day) ?? 0) + 28 - 1)));
      const m = win.reduce((a, b) => a + b.v, 0) / win.length;
      return `${x(idx.get(p.day) ?? 0).toFixed(2)},${y(m).toFixed(2)}`;
    })
    .join(" ");

  const save = async () => {
    const sb = supabase();
    if (!sb) return;
    const { error: e } = await sb.from("body_measurements").upsert({ day: isoDay(), [field]: Math.round(shown * 10) / 10 }, { onConflict: "user_id,day" });
    if (e) onError("Speichern hat nicht geklappt: " + e.message);
    else {
      onError("");
      setValue(null);
      onSaved();
    }
  };

  const savedToday = last?.day === isoDay() && value === null;

  return (
    <section className="card">
      <div className="card-row">
        <div className="stack">
          <span className="meta">{label} · Trend über 4 Wochen</span>
          <span className="big-number">{now === null ? "–" : fmt(now)}</span>
        </div>
        <span className="row-strong">{verdict}</span>
      </div>
      {points.length > 1 && (
        <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${label} der letzten 12 Wochen`}>
          {days.map((d, i) => (periodDays.has(d) ? <rect key={d} x={x(i) - 50 / DAYS} y={0} width={100 / DAYS} height={100} className="chart-period" /> : null))}
          <polyline points={raw} className="chart-raw" />
          <polyline points={trend} className="chart-line chart-line-neutral" />
        </svg>
      )}
      {points.length > 1 && (
        <div className="card-row meta">
          <span>{shortDate(daysAgo(DAYS - 1))}</span>
          <span>heute</span>
        </div>
      )}
      <div className="card-row list-line">
        <span className="row-label">Diese Woche</span>
        <div className="stepper">
          <button type="button" aria-label="Weniger" onClick={() => setValue(Math.round((shown - step) * 10) / 10)}>−</button>
          <span>{fmt(shown)}</span>
          <button type="button" aria-label="Mehr" onClick={() => setValue(Math.round((shown + step) * 10) / 10)}>+</button>
        </div>
      </div>
      <button type="button" className="btn btn-dark" disabled={savedToday} onClick={save}>
        {savedToday ? "Heute eingetragen" : "Eintragen"}
      </button>
    </section>
  );
}
