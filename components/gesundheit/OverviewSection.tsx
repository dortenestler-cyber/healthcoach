"use client";

import Link from "next/link";
import { Row } from "@/components/SettingsView";
import { useEffect, useState } from "react";
import { DivergingBars, ValueRing } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { SPOTS, type Illness, type Injury, type Intake, type Medication } from "@/lib/health";
import { DEFAULT_HABITS, loadHabits, type Habit } from "@/lib/habits";
import { frequency, hrvEffect, MIN_NIGHTS } from "@/lib/habitStats";
import { loadInsightData } from "@/lib/insightData";
import { patterns, type Data } from "@/lib/insights";
import { groupsFor } from "@/lib/intakes";
import { ILLNESSES } from "@/lib/health";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const ms = (v: number) => `${Math.round(v)} ms`;

// Gesundheit › Überblick (Konzept dunkel 2): heute auf einen Blick, was dir guttut, Gewohnheiten im Monat, weitere Muster.
// Muster mit Zyklusbezug stehen auf der Seite Zyklus.
export default function OverviewSection() {
  const [data, setData] = useState<Data | null>(null);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [intake, setIntake] = useState<{ done: number; total: number } | null>(null);
  const [illness, setIllness] = useState<Illness | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [error, setError] = useState("");
  const today = isoDay();

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadInsightData().then(setData).catch((e) => setError("Daten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
    loadHabits(sb).then(setHabits).catch(() => undefined);
    Promise.all([
      sb.from("medications").select("*").eq("active", true),
      sb.from("medication_intakes").select("id, medication_id, at, as_needed, slot, day").eq("day", today),
      sb.from("illnesses").select("*").is("ended_on", null).limit(1),
      sb.from("injuries").select("*").is("ended_on", null),
    ]).then(([m, t, il, inj]) => {
      const groups = groupsFor((m.data ?? []) as Medication[], (t.data ?? []) as Intake[]);
      const items = groups.flatMap((g) => g.items);
      setIntake({ done: items.filter((i) => i.done).length, total: items.length });
      setIllness(((il.data ?? []) as Illness[])[0] ?? null);
      setInjuries((inj.data ?? []) as Injury[]);
    });
  }, [today]);

  const from = isoDay(daysAgo(90));
  const effects = data
    ? habits
        .map((h) => ({ h, c: hrvEffect(data, h.key, from) }))
        .filter((x) => x.c.nWith > 0)
    : [];
  const ready = effects.filter((x) => x.c.diff !== null).sort((a, b) => (b.c.diff as number) - (a.c.diff as number));
  const waiting = effects.filter((x) => x.c.diff === null);
  const best = ready[0];
  const freq = data ? habits.map((h) => ({ h, f: frequency(data.diary, h.key, today) })).filter((x) => x.f.month > 0 || x.f.prevMonth > 0) : [];
  const more = data ? patterns(data).filter((p) => p.key !== "zyklus") : [];
  const injury = injuries[0];
  const month = MONTHS[Number(today.slice(5, 7)) - 1];

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <span className="eyebrow">Heute auf einen Blick</span>
        <div className="glance-grid">
          <Link href="/gesundheit?t=med" className="glance-tile">
            <ValueRing
              tone="neutral"
              size={64}
              value={intake && intake.total ? intake.done / intake.total : 0}
              center={intake ? `${intake.done}/${intake.total}` : "–"}
              caption=""
              label={intake ? `${intake.done} von ${intake.total} Einnahmen heute` : "Einnahmen werden geladen"}
            />
            <span className="row-strong">Einnahmen</span>
            <span className="meta">{!intake ? "lädt …" : !intake.total ? "keine geplant" : intake.done === intake.total ? "alle erledigt" : `${intake.total - intake.done} offen`}</span>
          </Link>
          <Link href="/gesundheit?t=krankverl" className="glance-tile">
            <span className={`glance-badge${illness ? " glance-warn" : " glance-ok"}`} aria-hidden="true">{illness ? "!" : "✓"}</span>
            <span className="row-strong">Krankheit</span>
            <span className="meta">{illness ? ILLNESSES.find((x) => x.key === illness.kind)?.label ?? "eingetragen" : "keine"}</span>
          </Link>
          <Link href="/gesundheit?t=krankverl" className="glance-tile">
            <span className={`glance-badge${injury ? " glance-warn" : " glance-ok"}`} aria-hidden="true">{injury ? "Reha" : "✓"}</span>
            <span className="row-strong">Verletzung</span>
            <span className="meta">{injury ? SPOTS[injury.spot]?.label ?? "eingetragen" : "keine"}</span>
          </Link>
        </div>
      </section>

      <section className="card">
        <span className="eyebrow">Täglich aktualisiert · letzte 90 Tage</span>
        <h2 className="card-title-lg">
          {best && (best.c.diff as number) >= 2
            ? `Nach „${best.h.label}“ ist deine HRV in der Nacht danach am höchsten.`
            : ready.length
              ? "Bisher hängt keine Gewohnheit deutlich mit deiner HRV zusammen."
              : `Was dir guttut, erscheint ab je ${MIN_NIGHTS} Nächten mit und ohne eine Gewohnheit.`}
        </h2>
        <p>HRV der Nacht danach mit und ohne Gewohnheit. Ein Zusammenhang, keine Ursache. Je Zyklusphase: Seite Zyklus.</p>
        {ready.length > 0 && (
          <DivergingBars
            fmt={ms}
            scaleMin={8}
            neg="HRV niedriger"
            pos="HRV höher"
            label={`HRV in der Nacht danach: ${ready.map((x) => `${x.h.label} ${(x.c.diff as number) > 0 ? "plus" : "minus"} ${ms(Math.abs(x.c.diff as number))}`).join(", ")}`}
            rows={ready.map((x) => ({ label: x.h.label, value: x.c.diff, note: `${x.c.nWith} Nächte mit · ${x.c.nWithout} ohne`, isNew: x.c.nWith <= MIN_NIGHTS + 1 }))}
          />
        )}
        {waiting.length > 0 && <span className="meta">Noch zu wenige Nächte: {waiting.map((x) => `${x.h.label} (${x.c.nWith} von ${MIN_NIGHTS})`).join(", ")}.</span>}
        {best && Math.abs(best.c.diff as number) >= 2 && (
          <ExplainCard tone="recovery">
            Nach <strong>{best.c.nWith} Tagen mit „{best.h.label}“</strong> lag deine HRV im Schnitt <strong>{ms(Math.abs(best.c.diff as number))} {(best.c.diff as number) >= 0 ? "höher" : "niedriger"}</strong> als in Nächten ohne.
          </ExplainCard>
        )}
      </section>

      <section className="card">
        <div className="card-row">
          <span className="eyebrow">Gewohnheiten im {month}</span>
          <Link href="/einstellungen/gewohnheiten" className="settings-link">Verwalten ›</Link>
        </div>
        {!freq.length && <p>Trag Gewohnheiten wie Sauna oder Alkohol im Tagebuch ein, dann erscheinen sie hier.</p>}
        <div className="factor-list">
          {freq.map(({ h, f }) => (
            <Link key={h.key} href={`/gesundheit/gewohnheit?k=${encodeURIComponent(h.key)}`} className="habit-month-row">
              <span className="row-strong habit-month-name">{h.label}</span>
              <span className="habit-weeks" role="img" aria-label={`Letzte 4 Wochen: ${f.weeks.join(", ")} Mal`}>
                {f.weeks.map((n, i) => (
                  <span key={i} className="habit-week"><span style={{ height: `${Math.min(100, (n / 4) * 100)}%` }} /></span>
                ))}
              </span>
              <span className="habit-month-count">{f.month}×</span>
              <span aria-hidden="true" className="meta">›</span>
            </Link>
          ))}
        </div>
      </section>

      {more.length > 0 && (
        <section className="card">
          <span className="eyebrow">Weitere Muster</span>
          {more.map((p) => (
            <div key={p.key} className="pattern-block">
              <span className="eyebrow pattern-title">{p.title}</span>
              <span className={p.ready ? "pattern-text" : "meta"}>{p.ready ? p.text : p.need}</span>
              {p.ready && p.bars.length > 0 && (
                <div className="pattern-bars">
                  {(() => {
                    const max = Math.max(...p.bars.map((b) => Math.abs(b.value)), 1);
                    return p.bars.map((b) => (
                      <div key={b.label} className="pattern-bar">
                        <span className="meta">{b.label}</span>
                        <span className="pattern-track"><span className={b.highlight ? "pattern-fill pattern-hi" : "pattern-fill"} style={{ width: `${(Math.abs(b.value) / max) * 100}%` }} /></span>
                        <strong>{b.display}</strong>
                      </div>
                    ));
                  })()}
                </div>
              )}
              {p.ready && <span className="meta">Grundlage: {p.basis}. Ein Zusammenhang, kein Beweis.</span>}
            </div>
          ))}
          <span className="meta">Muster mit Zyklusbezug stehen auf der Seite Zyklus.</span>
        </section>
      )}

      <section className="card settings-card" aria-label="Mehr">
        <Row label="Werte über die Zeit" note="HRV, Schlaf, Ruhepuls, Stress und mehr" href="/verlauf" />
        <Row label="Begriffe" note="HRV, Body Battery, Ruhepuls und mehr, kurz erklärt" href="/begriffe" />
      </section>
    </>
  );
}
