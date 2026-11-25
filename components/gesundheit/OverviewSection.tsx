"use client";

import { trainingPatterns } from "@/lib/trainingInsights";
import { useRefresh } from "@/lib/refresh";
import Link from "next/link";
import { Row } from "@/components/SettingsView";
import { useEffect, useState } from "react";
import { DivergingBars, ValueRing } from "@/components/charts";
import ExplainCard from "@/components/ui/ExplainCard";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { SPOTS, type Illness, type Injury, type Intake, type Medication } from "@/lib/health";
import { DEFAULT_HABITS, loadHabits, type Habit } from "@/lib/habits";
import { hrvEffect, MIN_NIGHTS } from "@/lib/habitStats";
import { loadInsightData } from "@/lib/insightData";
import { patterns, type Data } from "@/lib/insights";
import { groupsFor } from "@/lib/intakes";
import { ILLNESSES } from "@/lib/health";
import { signAnalysis } from "@/lib/anzeichen";
import { MIN_EVENT_DAYS } from "@/lib/muster";
import { ZusammenhangListe } from "@/components/ui/Zusammenhang";
import { deinMonat } from "@/lib/deinMonat";

const ms = (v: number) => `${Math.round(v)} ms`;

// Gesundheit › Überblick (Konzept dunkel 2): heute auf einen Blick, was dir guttut (mit Wegen zu jeder Gewohnheit), Dein Monat, weitere Muster.
// Muster mit Zyklusbezug stehen auf der Seite Zyklus.
export default function OverviewSection() {
  const [data, setData] = useState<Data | null>(null);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [intake, setIntake] = useState<{ done: number; total: number } | null>(null);
  const [illness, setIllness] = useState<Illness | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [allIll, setAllIll] = useState<Illness[]>([]);
  const [error, setError] = useState("");
  const today = isoDay();

  const [tick, setTick] = useState(0); // Neu laden (Konzept Datenaktualisierung)
  useRefresh(() => setTick((t) => t + 1));
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
      sb.from("illnesses").select("*").gte("started_on", isoDay(daysAgo(200))),
    ]).then(([m, t, il, inj, all]) => {
      setAllIll((all.data ?? []) as Illness[]);
      const groups = groupsFor((m.data ?? []) as Medication[], (t.data ?? []) as Intake[]);
      const items = groups.flatMap((g) => g.items);
      setIntake({ done: items.filter((i) => i.done).length, total: items.length });
      setIllness(((il.data ?? []) as Illness[])[0] ?? null);
      setInjuries((inj.data ?? []) as Injury[]);
    });
  }, [today, tick]);

  const from = isoDay(daysAgo(90));
  const effects = data
    ? habits
        .map((h) => ({ h, c: hrvEffect(data, h.key, from) }))
        .filter((x) => x.c.nWith > 0)
    : [];
  const ready = effects.filter((x) => x.c.diff !== null).sort((a, b) => (b.c.diff as number) - (a.c.diff as number));
  const waiting = effects.filter((x) => x.c.diff === null);
  const best = ready[0];
  // Anzeichen-Muster (Sammelliste Punkt 19): nur zeigen, wenn es schon Anzeichen gibt
  const signs = data ? signAnalysis(data, { muscle: [], intakes: [], illnesses: allIll }, today) : null;
  const signsShown = signs && signs.eventDays > 0 ? signs : null;
  // Training-Muster nur, wenn sie schon etwas zeigen; alle stehen unter Training › Insights
  const more = data ? [...patterns(data).filter((p) => p.key !== "zyklus"), ...trainingPatterns(data).filter((p) => p.ready)] : [];
  const injury = injuries[0];

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
        {/* Jede Gewohnheit hat ihre Seite (CLAUDE.md); „Gewohnheiten im Monat“ ist entfallen (Nutzerin 25.11.), die Wege stehen hier */}
        <span className="meta">Jede Gewohnheit im Einzelnen:</span>
        <div className="pills wrap">
          {habits.filter((h) => h.on).map((h) => (
            <Link key={h.key} href={`/wert/gewohnheit-${encodeURIComponent(h.key)}`} className="pill pill-sm habit-link">
              {h.label} ›
            </Link>
          ))}
        </div>
        {best && Math.abs(best.c.diff as number) >= 2 && (
          <ExplainCard tone="recovery">
            Nach <strong>{best.c.nWith} Tagen mit „{best.h.label}“</strong> lag deine HRV im Schnitt <strong>{ms(Math.abs(best.c.diff as number))} {(best.c.diff as number) >= 0 ? "höher" : "niedriger"}</strong> als in Nächten ohne.
          </ExplainCard>
        )}
      </section>

      {data && (() => {
        // Dein Monat (Konzept Bündeln, Baustein 6): nur was sich deutlich verändert hat, je ein Satz mit Link
        const dm = deinMonat(data, today, (k) => habits.find((h) => h.key === k)?.label ?? k);
        const n = dm.zeilen.length;
        return (
          <section className="card">
            <span className="eyebrow">Dein Monat · {dm.monat}</span>
            <h2>{n === 0 ? `Im ${dm.monat} ist alles etwa wie im ${dm.vormonat}.` : n === 1 ? `Eine Sache hat sich gegenüber ${dm.vormonat} verändert.` : `${n} Dinge haben sich gegenüber ${dm.vormonat} verändert.`}</h2>
            {dm.zeilen.map((z) => (
              <Link key={z.key} href={z.href} className="card-row list-line unit-link">
                <span>{z.text}</span>
                <span className="row-chev" aria-hidden="true">›</span>
              </Link>
            ))}
            <span className="meta">Werte: Schnitt bis heute gegen den Vormonat. Training und Gewohnheiten: bis heute gegen dieselben Tage im Vormonat. Gezeigt wird nur, was sich deutlich verändert hat.</span>
          </section>
        );
      })()}

      {(more.length > 0 || signsShown) && (
        <section className="card">
          <span className="eyebrow">Weitere Muster</span>
          {signsShown && (
            <div className="pattern-block">
              <span className="eyebrow pattern-title">Anzeichen wie rauer Hals oder verstopfte Nase</span>
              <ZusammenhangListe a={signsShown} mit="mit Anzeichen" start="Anzeichen trägst du im Tagebuch ein. Krankheitstage zählen nicht mit." leer={`Bei ${signsShown.eventDays} Tagen mit Anzeichen zeigt sich bisher kein deutliches Muster.`} />
            </div>
          )}
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
