"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { illnessRule, SPOTS, usualRange, weeklyCounts, weekStart, type Illness, type Injury, type Intake, type Medication } from "@/lib/health";

type Slot = { key: string; label: string; sub: string; meds: Medication[]; slot: string; done: boolean };

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

  // Regelmäßige Einnahmen: Medikamente einzeln, Supplements je Uhrzeit gebündelt
  const slots: Slot[] = [];
  for (const m of meds.filter((x) => x.regular && x.kind === "medikament")) {
    for (const t of m.times.length ? m.times : ["täglich"]) {
      const done = today.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t);
      slots.push({ key: m.id + t, label: m.name.replace(" Easyhaler", ""), sub: t === "täglich" ? "Regelmäßig" : "Regelmäßig · " + t, meds: [m], slot: t, done });
    }
  }
  const suppTimes = new Map<string, Medication[]>();
  for (const m of meds.filter((x) => x.regular && x.kind === "supplement")) {
    for (const t of m.times.length ? m.times : ["täglich"]) suppTimes.set(t, [...(suppTimes.get(t) ?? []), m]);
  }
  for (const [t, list] of [...suppTimes.entries()].sort()) {
    const done = list.every((m) => today.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t));
    slots.push({ key: "supp" + t, label: "Supplements", sub: list.map((m) => m.name).join(", ") + (t === "täglich" ? "" : " · " + t), meds: list, slot: t, done });
  }
  slots.sort((a, b) => a.slot.localeCompare(b.slot));

  const toggle = async (s: Slot) => {
    if (s.done) {
      const ids = today.filter((i) => s.meds.some((m) => m.id === i.medication_id) && !i.as_needed && i.slot === s.slot).map((i) => i.id);
      const { error: e } = await sb.from("medication_intakes").delete().in("id", ids);
      if (e) setError("Das hat nicht geklappt: " + e.message);
      setRinse(false);
    } else {
      const rows = s.meds.map((m) => ({ medication_id: m.id, slot: s.slot, day, as_needed: false, at: new Date().toISOString() }));
      const { error: e } = await sb.from("medication_intakes").insert(rows);
      if (e) setError("Das hat nicht geklappt: " + e.message);
      setRinse(s.meds.some((m) => m.notes_key === "bufori"));
    }
    load();
  };

  const neededMeds = meds.filter((m) => m.as_needed);
  const addHub = async (m: Medication) => {
    const { error: e } = await sb.from("medication_intakes").insert({ medication_id: m.id, as_needed: true, day, at: new Date().toISOString() });
    if (e) setError("Das hat nicht geklappt: " + e.message);
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

      {(slots.length > 0 || neededMeds.length > 0) && (
        <section className="card">
          <div className="card-row">
            <h2>Medikamente und Supplements</h2>
            <Link href="/gesundheit?t=med" className="link-small">Worauf achten ›</Link>
          </div>
          {error && <p className="alert alert-inline">{error}</p>}
          {slots.map((s) => (
            <div key={s.key} className="card-row list-line">
              <div className="stack">
                <span className="row-label">{s.label}</span>
                <span className="meta">{s.sub}</span>
              </div>
              <button type="button" className={s.done ? "pill pill-done" : "pill"} onClick={() => toggle(s)}>
                {s.done ? "✓ genommen" : "Abhaken"}
              </button>
            </div>
          ))}
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
