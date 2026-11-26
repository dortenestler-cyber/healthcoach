"use client";

// Tagesblatt (Konzept docs/konzept-buendeln.md, Baustein 1): ein Tag mit allem darin.
// Öffnet sich von überall, wo ein Datum steht (Trainingskalender, Zyklus-Kalender, später Diagramme).
// Von oben nach unten: Datum und Zyklustag · Auf einen Blick · Training · Tagebuch · Besonderes.
// Das Tagebuch bleibt das Zuhause zum Eintragen („Im Tagebuch bearbeiten ›“). Training wird hier geplant und erfasst.
// bare: ohne Karte und ohne Datum (im Blatt steht das Datum im Titel).
// Aufbau angelehnt an Vorlage 02 (Kopf mit Zyklustag, Aktionszeile) und 09 (Kacheln, Aktivitäten).

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import TagTraining from "@/components/tag/TagTraining";
import { supabase } from "@/lib/supabase";
import { isoDay, longDate } from "@/lib/dates";
import { loadActivityOverrides, withOverrides, type Activity } from "@/lib/garmin";
import { SPOTS, type Illness, type Injury } from "@/lib/health";
import { ALL_SYMPTOMS, BLEEDING, INFLUENCES } from "@/lib/catalog";
import { loadHabits } from "@/lib/habits";
import { computeTarget, dayLoad, type Data } from "@/lib/insights";
import { cycleToday, PHASES, readinessFrom } from "@/lib/cycle";
import { positionIn } from "@/lib/baseline";
import { bereichWort, zielWort } from "@/lib/einordnung";
import { vitalRows } from "@/lib/today";
import { sleepScore } from "@/lib/schlaf";
import type { Session } from "@/lib/training";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const LEVEL = ["", "leicht", "mittel", "stark"];
const fromIso = (d: string) => new Date(d + "T12:00:00");

type Span = { started_on: string; ended_on: string | null };
type DayExtra = {
  sessions: Session[];
  acts: Activity[];
  illness: Illness | null; // aktuelle Krankheit (für Hinweise beim Planen)
  injuries: Injury[]; // aktuelle Verletzungen
  illDay: (Illness & Span)[]; // Krankheiten an diesem Tag
  injDay: (Injury & Span)[]; // Verletzungen an diesem Tag
  intakes: number;
  cramps: number;
  flashes: number;
  habitLabels: Map<string, string>;
};

const covers = (s: Span, day: string) => s.started_on <= day && (s.ended_on === null || s.ended_on >= day);

type Tile = { key: string; label: string; value: string; word: string; href: string };

// kompakt: ohne Kacheln „Auf einen Blick“ (zentraler Kalender, Konzept docs/konzept-einfach.md)
export default function Tagesblatt({ day, data, onChanged, intro, bare = false, kompakt = false }: { day: string; data: Data | null; onChanged?: () => void; intro?: ReactNode; bare?: boolean; kompakt?: boolean }) {
  const [extra, setExtra] = useState<DayExtra | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const next = new Date(fromIso(day));
    next.setDate(next.getDate() + 1);
    const [p, a, il, inj, ills, injs, it, mu, fl, so, habits] = await Promise.all([
      sb.from("planned_sessions").select("*").eq("day", day),
      sb.from("garmin_activities").select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load, sport_override, sport_label").gte("start_local", day).lte("start_local", day + "T23:59:59"),
      sb.from("illnesses").select("*").is("ended_on", null).limit(1),
      sb.from("injuries").select("*").is("ended_on", null),
      sb.from("illnesses").select("*").lte("started_on", day),
      sb.from("injuries").select("*").lte("started_on", day),
      sb.from("medication_intakes").select("medication_id", { count: "exact", head: true }).eq("day", day),
      sb.from("muscle_events").select("id", { count: "exact", head: true }).eq("day", day),
      sb.from("hot_flashes").select("id", { count: "exact", head: true }).gte("at", new Date(day + "T00:00:00").toISOString()).lt("at", new Date(isoDay(next) + "T00:00:00").toISOString()),
      loadActivityOverrides(sb, day),
      loadHabits(sb).catch(() => null),
    ]);
    setExtra({
      sessions: (p.data ?? []) as Session[],
      acts: withOverrides((a.data ?? []) as Activity[], so),
      illness: ((il.data ?? []) as Illness[])[0] ?? null,
      injuries: (inj.data ?? []) as Injury[],
      illDay: ((ills.data ?? []) as (Illness & Span)[]).filter((x) => covers(x, day)),
      injDay: ((injs.data ?? []) as (Injury & Span)[]).filter((x) => covers(x, day)),
      intakes: it.count ?? 0,
      cramps: mu.error ? 0 : (mu.count ?? 0),
      flashes: fl.error ? 0 : (fl.count ?? 0),
      habitLabels: new Map((habits ?? INFLUENCES).map((h) => [h.key, h.label])),
    });
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged?.();
  };

  const today = isoDay();
  const future = day > today;
  const cyc = data ? cycleToday(day, data.diary) : null;
  const phase = cyc?.phase ? PHASES[cyc.phase] : null;

  // Auf einen Blick: nur Tage bis heute, nur Werte, die es gibt
  const tiles: Tile[] = [];
  if (data && !future) {
    const q = `?tag=${day}`;
    const d = data.daily.find((r) => r.day === day);
    const t = computeTarget(day, data);
    if (d && t.factors.length) {
      const r = readinessFrom(t);
      tiles.push({ key: "readiness", label: "Readiness", value: r.missing ? "–" : de1(r.value), word: r.label, href: `/wert/readiness${q}` });
    }
    const sl = sleepScore(day, data);
    if (sl.total !== null) tiles.push({ key: "schlaf", label: "Schlaf", value: String(sl.total), word: d?.sleep_seconds ? `${Math.floor(d.sleep_seconds / 3600)} h ${String(Math.round((d.sleep_seconds % 3600) / 60)).padStart(2, "0")}` : "Punkte", href: `/wert/schlaf${q}` });
    const dl = dayLoad(day, data.daily, data.acts);
    if (d || dl.training) tiles.push({ key: "belastung", label: "Belastung", value: `${dl.pct} %`, word: zielWort(dl.pct, t), href: `/wert/belastung${q}` });
    for (const r of vitalRows(day, data).filter((x) => x.key === "hrv" || x.key === "ruhepuls" || x.key === "stress")) {
      if (r.value === null) continue;
      const pos = r.base.active ? positionIn(r.value, r.base.active) : null;
      tiles.push({ key: r.key, label: r.label, value: r.fmt(r.value), word: pos ? bereichWort(pos) : "Bereich ab 14 Tagen", href: r.key === "stress" ? `/wert/stress${q}` : (r.href ?? `/wert/${r.key}`) });
    }
  }

  // Tagebuch
  const entry = data?.diary.find((e) => e.day === day && !e.garminOnly) ?? null;
  const bleeding = data?.diary.find((e) => e.day === day)?.bleeding ?? 0;
  const symptoms = entry ? ALL_SYMPTOMS.filter((s) => (entry.symptoms?.[s.key] ?? 0) > 0).map((s) => `${s.label} (${LEVEL[entry.symptoms[s.key]] ?? ""})`) : [];
  const habits = (data?.diary.find((e) => e.day === day)?.influences ?? []).map((k) => extra?.habitLabels.get(k) ?? k);
  const diaryLines: [string, string][] = [];
  if (bleeding > 0) diaryLines.push(["Blutung", BLEEDING[bleeding] ?? ""]);
  if (symptoms.length) diaryLines.push(["Symptome", symptoms.join(", ")]);
  if (habits.length) diaryLines.push(["Gewohnheiten", habits.join(", ")]);
  if (extra?.intakes) diaryLines.push(["Medikamente", `${extra.intakes} ${extra.intakes === 1 ? "Einnahme" : "Einnahmen"} abgehakt`]);

  // Besonderes
  const special: [string, string][] = [];
  for (const i of extra?.illDay ?? []) special.push(["Krank", i.label]);
  for (const i of extra?.injDay ?? []) special.push(["Verletzt", SPOTS[i.spot]?.label ?? i.spot]);
  if (extra?.cramps) special.push(["Wadenkrampf", `${extra.cramps}×`]);
  if (extra?.flashes) special.push(["Hitzewallungen", `${extra.flashes}×`]);

  const body = (
    <div className="tag-blatt">
      <div className="tag-head">
        {!bare && <h2>{day === today ? "Heute" : longDate(fromIso(day))}</h2>}
        {cyc && (
          <span className="tag-cycle">
            {cyc.cycleDay !== null ? `Zyklustag ${cyc.cycleDay}` : "Zyklus noch unbekannt"}
            {phase ? ` · ${phase.label} (geschätzt)` : ""}
          </span>
        )}
      </div>

      {!kompakt && tiles.length > 0 && (
        <div className="tag-sec">
          <span className="eyebrow">Auf einen Blick</span>
          <div className="today-glance">
            {tiles.map((t) => (
              <Link key={t.key} href={t.href} className="today-tile tag-tile">
                <span className="today-tile-text">
                  <span className="today-tile-label">{t.label}</span>
                  <span className="today-tile-value">{t.value}</span>
                  <span className="today-tile-word">{t.word}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="tag-sec">
        <span className="eyebrow">Training</span>
        {intro}
        {extra ? <TagTraining day={day} sessions={extra.sessions} acts={extra.acts} illness={extra.illness} injuries={extra.injuries} onChanged={changed} /> : <p className="meta">Lädt …</p>}
      </div>

      {!future && (
        <div className="tag-sec">
          <span className="eyebrow">Tagebuch</span>
          {diaryLines.length ? (
            diaryLines.map(([k, v]) => (
              <div key={k} className="card-row list-line">
                <span className="row-label">{k}</span>
                <span className="meta tag-val">{v}</span>
              </div>
            ))
          ) : (
            <p className="meta">Noch nichts eingetragen.</p>
          )}
          <Link href={`/tagebuch?tag=${day}`} className="add-row">
            <span className="add-row-label">Im Tagebuch bearbeiten</span>
            <span className="add-row-plus" aria-hidden="true">›</span>
          </Link>
        </div>
      )}

      {special.length > 0 && (
        <div className="tag-sec">
          <span className="eyebrow">Besonderes</span>
          {special.map(([k, v], i) => (
            <div key={k + i} className="card-row list-line">
              <span className="row-label">{k}</span>
              <span className="meta tag-val">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return bare ? body : <section className="card">{body}</section>;
}
