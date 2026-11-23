"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ValueRing } from "@/components/charts";
import type { Tone } from "@/components/charts/scale";
import type { DayRule } from "@/lib/cycle";
import { energyDay } from "@/lib/energie";
import { dayLoad, type Data } from "@/lib/insights";
import { stressDay } from "@/lib/stress";
import { sleepAchieved } from "@/lib/today";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type RingItem = { key: string; label: string; tone: Tone; value: number; center: string; word: string; aria: string; split?: number | null; target?: { lo: number; hi: number } | null; main?: boolean };

// „Dein Tag“: fünf Ringe in einer wischbaren Reihe (nach Sonar). Wort über dem Ring, Zahl und Zustand darin.
// Readiness steht groß in der Mitte, links und rechts schauen die äußeren Ringe hervor. Ein Tipp öffnet die Detailseite.
export default function RingRow({ day, data, rule, nowMinute, showLoad, showGarmin }: { day: string; data: Data; rule: DayRule; nowMinute: number; showLoad: boolean; showGarmin: boolean }) {
  const row = useRef<HTMLDivElement>(null);
  const mid = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const r = row.current;
    const m = mid.current;
    if (r && m) r.scrollLeft = m.offsetLeft - (r.clientWidth - m.offsetWidth) / 2;
  }, [day]);

  const items: RingItem[] = [];

  if (showGarmin) {
    const e = energyDay(day, data.daily, data.acts, nowMinute);
    const last = [...e.today].reverse().find((v) => v !== null) ?? null;
    items.push({ key: "energie", label: "Energie", tone: "energy", value: (last ?? 0) / 100, center: last === null ? "–" : String(Math.round(last)), word: last === null ? "kein Wert" : "Body Battery", aria: last === null ? "Energie: noch kein Wert" : `Energie, Body Battery ${Math.round(last)} von 100` });
  }

  const slept = sleepAchieved(day, data);
  const sleepPct = slept.ratio === null ? null : Math.round(slept.ratio * 100);
  items.push({ key: "schlaf", label: "Schlaf", tone: "sleep", value: slept.ratio ?? 0, center: sleepPct === null ? "–" : `${sleepPct} %`, word: sleepPct === null ? "kein Wert" : "vom Bedarf", aria: sleepPct === null ? "Schlaf: noch kein Wert für letzte Nacht" : `Schlaf ${sleepPct} Prozent vom Bedarf` });

  const r = rule.readiness;
  const warn = rule.level === "warnzeichen";
  items.push({ key: "readiness", label: "Readiness", tone: "recovery", value: warn ? 0 : r.value / 10, center: warn ? "–" : de1(r.value), word: warn ? "Hinweis" : r.label, aria: warn ? "Readiness: siehe Hinweis" : `Readiness ${de1(r.value)} von 10, ${r.label}`, main: true });

  if (showLoad) {
    const t = rule.target;
    const dl = dayLoad(day, data.daily, data.acts);
    const word = t.pause ? "Pause" : dl.pct < t.lo ? "unter Ziel" : dl.pct <= t.hi ? "im Ziel" : "über Ziel";
    items.push({ key: "belastung", label: "Belastung", tone: "training", value: dl.pct / 100, split: dl.quelle ? dl.pctTraining / 100 : null, target: t.pause ? null : { lo: t.lo / 100, hi: t.hi / 100 }, center: `${dl.pct} %`, word, aria: `Belastung ${dl.pct} Prozent, ${word}${t.pause ? "" : `, Ziel ${t.lo} bis ${t.hi} Prozent`}` });
  }

  if (showGarmin) {
    const s = stressDay(day, data.daily);
    items.push({ key: "stress", label: "Stress", tone: "stress", value: (s.value ?? 0) / 100, center: s.value === null ? "–" : String(s.value), word: s.word ?? "kein Wert", aria: s.value === null ? "Stress: noch kein Wert" : `Stress ${s.value} von 100, ${s.word}` });
  }

  const q = `?tag=${day}`;

  return (
    <section className="ring-strip-wrap" aria-label="Dein Tag">
      <h2 className="sec-title">Dein Tag</h2>
      <div className="ring-strip" ref={row}>
        {items.map((it) => (
          <Link key={it.key} ref={it.main ? mid : undefined} href={`/heute/${it.key}${q}`} className={"ring-strip-cell" + (it.main ? " is-main" : "")} aria-label={`${it.aria}. Details öffnen`}>
            <span className="ring-strip-label">{it.label}</span>
            <ValueRing tone={it.tone} size={it.main ? 120 : 92} value={it.value} split={it.split} target={it.target} center={it.center} caption={it.word} label={it.aria} />
          </Link>
        ))}
      </div>
    </section>
  );
}
