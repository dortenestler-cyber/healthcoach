"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, shortDate } from "@/lib/dates";
import { daysSince, fitnessAge, waistOn, type FitAct, type FitDay, type FitIllness } from "@/lib/fitnessAge";

type Waist = { day: string; waist_cm: number | null };
const MONTHS = 6;

// Eigenes Fitness-Alter (HUNT-Modell), Rechnung in lib/fitnessAge.ts.
// Bauchumfang ohne Zielvorgabe: er geht in die Rechnung ein, wird aber nicht als Hebel angeboten.
export default function FitnessAgeCard({ settings, onSettings, onShowWaist }: { settings: Record<string, unknown>; onSettings: (next: Record<string, unknown>) => Promise<void>; onShowWaist: () => void }) {
  const [days, setDays] = useState<FitDay[]>([]);
  const [acts, setActs] = useState<FitAct[]>([]);
  const [ill, setIll] = useState<FitIllness[]>([]);
  const [waists, setWaists] = useState<Waist[]>([]);
  const [garminFa, setGarminFa] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState<number | null>(null);

  const birthYear = typeof settings.birthYear === "number" ? settings.birthYear : null;

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(daysAgo(MONTHS * 31 + 28));
    const [g, a, i, b] = await Promise.all([
      sb.from("garmin_daily").select("*").gte("day", from).order("day"),
      sb.from("garmin_activities").select("start_local, duration_s, avg_hr").gte("start_local", from),
      sb.from("illnesses").select("started_on, ended_on"),
      sb.from("body_measurements").select("day, waist_cm").gte("day", isoDay(daysAgo(MONTHS * 31 + 180))).order("day"),
    ]);
    const err = g.error ?? a.error ?? i.error ?? b.error;
    if (err) setError("Daten für das Fitness-Alter konnten nicht geladen werden: " + err.message);
    const rows = (g.data ?? []) as { day: string; resting_hr: number | null; fitness_age?: number | null }[];
    setDays(rows.map((r) => ({ day: r.day, resting_hr: r.resting_hr })));
    const fa = [...rows].reverse().find((r) => typeof r.fitness_age === "number");
    setGarminFa(fa ? (fa.fitness_age as number) : null);
    setActs((a.data ?? []) as FitAct[]);
    setIll((i.data ?? []) as FitIllness[]);
    setWaists(((b.data ?? []) as Waist[]).map((r) => ({ day: r.day, waist_cm: r.waist_cm === null ? null : Number(r.waist_cm) })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = isoDay();
  const waist = waistOn(waists, today);
  const result = useMemo(
    () => (birthYear && waist ? fitnessAge({ birthYear, waist: waist.value, days, acts, ill, day: today }) : null),
    [birthYear, waist, days, acts, ill, today],
  );

  // Verlauf: Fitness-Alter am Monatsende der letzten Monate, mit den Daten bis zu diesem Tag
  const history = useMemo(() => {
    if (!birthYear) return [];
    const out: { day: string; label: string; v: number }[] = [];
    const now = new Date();
    for (let m = MONTHS - 1; m >= 0; m--) {
      const end = m === 0 ? now : new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
      const day = isoDay(end);
      const w = waistOn(waists, day);
      if (!w) continue;
      const r = fitnessAge({ birthYear, waist: w.value, days, acts, ill, day });
      if (r) out.push({ day, label: end.toLocaleDateString("de-DE", { month: "short" }), v: r.fitnessAge });
    }
    return out;
  }, [birthYear, waists, days, acts, ill]);

  // Geburtsjahr fehlt
  if (!birthYear) {
    const shown = year ?? new Date().getFullYear() - 40;
    return (
      <section className="card">
        <span className="meta">Fitness-Alter</span>
        <p>Für das Fitness-Alter braucht die App dein Geburtsjahr. Es bleibt in deinem Konto.</p>
        <div className="card-row list-line">
          <span className="row-label">Geburtsjahr</span>
          <div className="stepper">
            <button type="button" aria-label="Früher" onClick={() => setYear(shown - 1)}>−</button>
            <span>{shown}</span>
            <button type="button" aria-label="Später" onClick={() => setYear(shown + 1)}>+</button>
          </div>
        </div>
        <button type="button" className="btn btn-dark" onClick={() => { setYear(shown); onSettings({ ...settings, birthYear: shown }); }}>
          Speichern
        </button>
      </section>
    );
  }

  const waistOld = waist ? daysSince(waist.day, today) > 30 : false;
  const first = history[0];
  const last = history[history.length - 1];
  const diff = first && last && history.length > 1 ? last.v - first.v : null;
  const headline =
    diff === null ? "Verlauf erscheint ab dem zweiten Monat mit Daten" : diff === 0 ? `Seit ${first.label} unverändert` : diff < 0 ? `Seit ${first.label} ${-diff} ${-diff === 1 ? "Jahr" : "Jahre"} jünger` : `Seit ${first.label} ${diff} ${diff === 1 ? "Jahr" : "Jahre"} älter`;

  const lo = history.length ? Math.min(...history.map((h) => h.v)) - 3 : 0;
  const hi = history.length ? Math.max(...history.map((h) => h.v)) + 3 : 1;
  const x = (i: number) => (history.length > 1 ? (i / (history.length - 1)) * 100 : 50);
  const y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;

  return (
    <section className="card">
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="card-row">
        <div className="stack">
          <span className="meta">Fitness-Alter · Schätzung</span>
          <span className="big-number">{result ? `${result.fitnessAge} Jahre` : "–"}</span>
        </div>
        {result && <span className="row-strong">echtes Alter {result.age}</span>}
      </div>

      {!waist && (
        <>
          <p>Für die Rechnung fehlt dein Bauchumfang. Trag ihn einmal ein, danach reicht einmal im Monat.</p>
          <button type="button" className="btn btn-dark" onClick={onShowWaist}>Bauchumfang eintragen</button>
        </>
      )}
      {waist && !result && <p>Noch zu wenige Tage mit Ruhepuls aus Garmin. Es braucht mindestens 7 in den letzten 4 Wochen.</p>}

      {result && (
        <>
          <p className="meta">
            Spanne {result.low}–{result.high} Jahre. Die Formel liegt im Schnitt etwa 5 ml/kg/min daneben. Für dich zählt vor allem die Veränderung über die Monate.
          </p>
          <div className="list-line card-row">
            <span className="row-label">Ruhepuls (Median 4 Wochen)</span>
            <span>{Math.round(result.rhr)} Schläge/min</span>
          </div>
          <div className="list-line card-row">
            <span className="row-label">Einheiten mit Puls ab 64 % (4 Wochen)</span>
            <span>{result.activity.sessions} · {result.activity.perWeek.toLocaleString("de-DE", { maximumFractionDigits: 1 })} pro Woche</span>
          </div>
          <div className="list-line card-row">
            <span className="row-label">Bauchumfang</span>
            <span>{result.waist.toLocaleString("de-DE", { maximumFractionDigits: 1 })} cm · {shortDate(new Date(waist!.day + "T12:00:00"))}</span>
          </div>
          {waistOld && (
            <p className="meta-warn">
              Bauchumfang ist über einen Monat alt.{" "}
              <button type="button" className="link-button" onClick={onShowWaist}>Neu eintragen</button>
            </p>
          )}

          {result.levers.length > 0 && (
            <>
              <h3>Was es bewegt</h3>
              {result.levers.map((l) => (
                <div key={l.label} className="list-line card-row">
                  <span className="row-label">{l.label}</span>
                  <span className="row-strong">etwa −{l.years.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Jahre</span>
                </div>
              ))}
            </>
          )}

          {garminFa !== null && <p className="meta">Zum Vergleich: Garmin schätzt {garminFa} Jahre.</p>}
        </>
      )}

      {history.length > 0 && (
        <>
          <h3>{headline}</h3>
          <svg className="chart" viewBox="-4 -8 108 116" preserveAspectRatio="none" role="img" aria-label={`Fitness-Alter pro Monat: ${history.map((h) => `${h.label} ${h.v}`).join(", ")}`}>
            <polyline points={history.map((h, i) => `${x(i)},${y(h.v)}`).join(" ")} className="chart-line" />
          </svg>
          <div className="card-row meta">
            {history.map((h) => (
              <span key={h.day}>{h.label} {h.v}</span>
            ))}
          </div>
        </>
      )}

      <p className="meta">
        Berechnet nach der HUNT-Studie (Nes et al. 2011) aus Alter, Bauchumfang, Ruhepuls und deinen Garmin-Einheiten, verglichen mit den Normwerten für Frauen. Eine Schätzung, keine Messung.
      </p>
    </section>
  );
}
