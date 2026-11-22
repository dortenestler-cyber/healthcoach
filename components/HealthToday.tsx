"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { illnessRule, SPOTS, usualRange, weeklyCounts, weekStart, type Illness, type Injury, type Intake, type Medication } from "@/lib/health";
import { addAsNeeded } from "@/lib/intakes";
import IntakeChecklist from "@/components/IntakeChecklist";

// Heute: Hinweise bei Krankheit oder Verletzung und die Einnahmen des Tages
export default function HealthToday() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [today, setToday] = useState<Intake[]>([]);
  const [hubs, setHubs] = useState<{ at: string }[]>([]);
  const [illness, setIllness] = useState<Illness | null>(null);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [rinse, setRinse] = useState(false);
  const [error, setError] = useState("");
  const day = isoDay();

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [m, t, h, il, inj] = await Promise.all([
      sb.from("medications").select("*").eq("active", true).order("created_at"),
      sb.from("medication_intakes").select("id, medication_id, at, as_needed, slot, day").eq("day", day),
      sb.from("medication_intakes").select("at").eq("as_needed", true).gte("at", weekStart(daysAgo(7 * 8)).toISOString()),
      sb.from("illnesses").select("*").is("ended_on", null).limit(1),
      sb.from("injuries").select("*").is("ended_on", null),
    ]);
    if (m.error) {
      setError("Medikamente konnten nicht geladen werden: " + m.error.message);
      return;
    }
    setMeds((m.data ?? []) as Medication[]);
    setToday((t.data ?? []) as Intake[]);
    setHubs((h.data ?? []) as { at: string }[]);
    setIllness(((il.data ?? []) as Illness[])[0] ?? null);
    setInjuries((inj.data ?? []) as Injury[]);
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const hasRegular = meds.some((m) => m.regular);

  const neededMeds = meds.filter((m) => m.as_needed);
  const addHub = async (m: Medication) => {
    const e = await addAsNeeded(sb, day, m);
    if (e) setError("Das hat nicht geklappt: " + e);
    setRinse(m.notes_key === "bufori");
    load();
  };

  const counts = weeklyCounts(hubs, 9);
  const range = usualRange(counts.slice(0, -1));
  const week = counts[counts.length - 1];
  const rule = illness ? illnessRule(illness) : null;

  return (
    <>
      {illness && rule && (
        <Link href="/gesundheit?t=krank" className="banner">
          <span className="row-strong">{illness.label} · Stärke {illness.severity} ›</span>
          <span>Training {rule.title}. {rule.text}</span>
        </Link>
      )}
      {injuries.map((i) => (
        <Link key={i.id} href="/gesundheit?t=verl" className="banner">
          <span className="row-strong">Verletzung: {SPOTS[i.spot]?.label ?? i.spot} ›</span>
          <span>{SPOTS[i.spot]?.sports.includes("klettern") ? "Klettern ist pausiert, Übungen werden ersetzt." : "Übungen werden ersetzt, Training geht angepasst weiter."}</span>
        </Link>
      ))}

      {(hasRegular || neededMeds.length > 0) && (
        <section className="card">
          <div className="card-row">
            <h2>Medikamente und Supplements</h2>
            <Link href="/gesundheit?t=med" className="link-small">Worauf achten ›</Link>
          </div>
          {error && <p className="alert alert-inline">{error}</p>}
          <IntakeChecklist day={day} meds={meds} intakes={today} onChanged={load} onError={setError} onBufori={setRinse} />
          {neededMeds.map((m) => {
            const todayCount = today.filter((i) => i.medication_id === m.id && i.as_needed).length;
            const over = week > range.hi;
            return (
              <div key={m.id} className="card-row list-line">
                <div className="stack">
                  <span className="row-label">{m.name.replace(" Easyhaler", "")} bei Bedarf</span>
                  <span className={over ? "meta meta-warn" : "meta"}>
                    {todayCount} heute · {week} diese Woche
                  </span>
                </div>
                <button type="button" className="btn btn-soft" onClick={() => addHub(m)}>
                  + Hub
                </button>
              </div>
            );
          })}
          {rinse && <p className="note">Mund ausspülen nicht vergessen, das beugt Pilzinfektionen im Mund vor.</p>}
          {neededMeds.length > 0 && week > range.hi && (
            <p className="alert alert-inline">
              Diese Woche brauchst du mehr Bedarfs-Hübe als sonst ({week} statt {range.lo} bis {range.hi}). Bitte ärztlich abklären. Atemnot trotz Inhalator ist ein Notfall: 112.
            </p>
          )}
        </section>
      )}

      {meds.length === 0 && !error && (
        <section className="card">
          <div className="card-row">
            <h2>Medikamente und Supplements</h2>
            <Link href="/gesundheit?t=med" className="link-small">Anlegen ›</Link>
          </div>
          <p>Leg unter Gesundheit deine Mittel an, dann kannst du sie hier abhaken.</p>
        </section>
      )}

      <section className="card card-tight">
        <div className="card-row">
          <span className="row-label">Krank oder verletzt?</span>
          <div className="pills">
            <Link href="/gesundheit?t=krank" className="pill pill-sm pill-link">Krankheit</Link>
            <Link href="/gesundheit?t=verl" className="pill pill-sm pill-link">Verletzung</Link>
          </div>
        </div>
      </section>
    </>
  );
}
