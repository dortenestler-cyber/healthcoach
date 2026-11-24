"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { ValueRing } from "@/components/charts";
import type { Tone } from "@/components/charts/scale";
import type { DayRule, Phase } from "@/lib/cycle";
import { energyDay } from "@/lib/energie";
import { dayLoad, type Data } from "@/lib/insights";
import { stressDay } from "@/lib/stress";
import { sleepAchieved } from "@/lib/today";
import { weekIntensity, WHO_MINUTES } from "@/lib/trainingLoad";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type RingItem = { key: string; href: string; label: string; tone: Tone; value: number; center: string; word: string; aria: string; split?: number | null; target?: { lo: number; hi: number } | null; main?: boolean };

const COPIES = 5; // Endlos-Schleife: die Reihe liegt fünfmal nebeneinander, echt ist nur die mittlere
const MID = 2;
const IDLE_MS = 140;

// Größe nach Abstand zur Mitte (in Ringen): Mitte 1, Nachbarn 0,74, danach 0,6
function scaleAt(d: number) {
  return 1 - 0.26 * Math.min(d, 1) - 0.14 * Math.max(0, Math.min(d - 1, 1));
}

// Kurzes Wort für die Zyklusphase im Ring
const PHASE_WORD: Record<Phase, string> = { menstruation: "Periode", follikel: "Follikel", eisprung: "Eisprung", "luteal-frueh": "Luteal früh", "luteal-spaet": "Luteal spät" };

// Breite, ab der alle Ringe nebeneinander passen (Readiness 120 px, die anderen 92 px). Darunter: Rondell.
const staticMin = (n: number) => 128 + (n - 1) * 100;
const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// „Dein Tag“: Ringe als Rondell. Der Ring in der Mitte ist groß, nach außen werden sie kleiner,
// fließend beim Wischen. Hinter dem letzten Ring kommt wieder der erste (Endlos-Schleife).
// Tipp auf einen äußeren Ring dreht ihn in die Mitte, Tipp auf den mittleren öffnet die Detailseite.
// Nach dem Wischen meldet onCenter den Ring in der Mitte (für die Erklärkarte darunter).
// Ist genug Platz (Computer), stehen alle Ringe nebeneinander, Readiness groß, und onCenter meldet Readiness.
export default function RingRow({ day, data, rule, nowMinute, showLoad, showGarmin, showCycle, onCenter }: { day: string; data: Data; rule: DayRule; nowMinute: number; showLoad: boolean; showGarmin: boolean; showCycle: boolean; onCenter?: (key: string) => void }) {
  const wrapRef = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [isStatic, setStatic] = useState(false);
  const centerCb = useRef(onCenter);
  centerCb.current = onCenter;
  const frame = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const items: RingItem[] = [];
  const q = `?tag=${day}`;

  if (showCycle) {
    const c = rule.cycle;
    const word = c.cycleDay === null ? "kein Wert" : c.phase ? PHASE_WORD[c.phase] : "Phase offen";
    items.push({ key: "zyklus", href: "/zyklus", label: "Zyklus", tone: c.phase === "menstruation" ? "menses" : "cycle", value: c.cycleDay === null ? 0 : c.cycleDay / Math.max(c.length, c.cycleDay), center: c.cycleDay === null ? "–" : `Tag ${c.cycleDay}`, word, aria: c.cycleDay === null ? "Zyklus: noch kein Zyklustag" : `Zyklustag ${c.cycleDay} von etwa ${c.length}${c.phase ? `, ${word}` : ""}` });
  }

  if (showGarmin) {
    const e = energyDay(day, data.daily, data.acts, nowMinute);
    const last = [...e.today].reverse().find((v) => v !== null) ?? null;
    items.push({ key: "energie", href: `/heute/energie${q}`, label: "Energie", tone: "energy", value: (last ?? 0) / 100, center: last === null ? "–" : String(Math.round(last)), word: last === null ? "kein Wert" : "Body Battery", aria: last === null ? "Energie: noch kein Wert" : `Energie, Body Battery ${Math.round(last)} von 100` });
  }

  const slept = sleepAchieved(day, data);
  const sleepPct = slept.ratio === null ? null : Math.round(slept.ratio * 100);
  items.push({ key: "schlaf", href: `/heute/schlaf${q}`, label: "Schlaf", tone: "sleep", value: slept.ratio ?? 0, center: sleepPct === null ? "–" : `${sleepPct} %`, word: sleepPct === null ? "kein Wert" : "vom Bedarf", aria: sleepPct === null ? "Schlaf: noch kein Wert für letzte Nacht" : `Schlaf ${sleepPct} Prozent vom Bedarf` });

  const r = rule.readiness;
  const warn = rule.level === "warnzeichen";
  items.push({ key: "readiness", href: `/heute/readiness${q}`, label: "Readiness", tone: "recovery", value: warn ? 0 : r.value / 10, center: warn ? "–" : de1(r.value), word: warn ? "Hinweis" : r.label, aria: warn ? "Readiness: siehe Hinweis" : `Readiness ${de1(r.value)} von 10, ${r.label}`, main: true });

  if (showLoad) {
    const t = rule.target;
    const dl = dayLoad(day, data.daily, data.acts);
    const word = t.pause ? "Pause" : dl.pct < t.lo ? "unter Ziel" : dl.pct <= t.hi ? "im Ziel" : "über Ziel";
    items.push({ key: "belastung", href: `/heute/belastung${q}`, label: "Belastung", tone: "training", value: dl.pct / 100, split: dl.quelle ? dl.pctTraining / 100 : null, target: t.pause ? null : { lo: t.lo / 100, hi: t.hi / 100 }, center: `${dl.pct} %`, word, aria: `Belastung ${dl.pct} Prozent, ${word}${t.pause ? "" : `, Ziel ${t.lo} bis ${t.hi} Prozent`}` });
  }

  if (showGarmin) {
    const im = weekIntensity(day, data);
    items.push({ key: "intensitaet", href: `/heute/intensitaet${q}`, label: "Intensität", tone: "training", value: im / WHO_MINUTES, center: String(im), word: `von ${WHO_MINUTES} min`, aria: `Intensitätsminuten diese Woche ${im} von ${WHO_MINUTES}` });
  }

  if (showGarmin) {
    const s = stressDay(day, data.daily);
    items.push({ key: "stress", href: `/heute/stress${q}`, label: "Stress", tone: "stress", value: (s.value ?? 0) / 100, center: s.value === null ? "–" : String(s.value), word: s.word ?? "kein Wert", aria: s.value === null ? "Stress: noch kein Wert" : `Stress ${s.value} von 100, ${s.word}` });
  }

  const n = items.length;
  const carousel = useCallback(() => (wrapRef.current?.clientWidth ?? 0) < staticMin(n), [n]);
  const mainIdx = Math.max(0, items.findIndex((it) => it.main));

  const cells = useCallback(() => Array.from(row.current?.querySelectorAll<HTMLElement>(".ring-strip-cell") ?? []), []);

  const centerIndex = useCallback(() => {
    const r = row.current;
    if (!r) return -1;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let best = -1;
    let bestD = Infinity;
    cells().forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }, [cells]);

  // Größe, Helligkeit und Mitte nach der aktuellen Wischposition setzen
  const paint = useCallback(() => {
    const r = row.current;
    if (!r || !carousel()) return;
    const all = cells();
    if (all.length < 2) return;
    const step = all[1].offsetLeft - all[0].offsetLeft || 1;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const c of all) {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) / step;
      const k = scaleAt(d);
      c.style.setProperty("--k", k.toFixed(3));
      c.style.setProperty("--o", (0.62 + 0.38 * ((k - 0.6) / 0.4)).toFixed(3));
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    for (const c of all) c.classList.toggle("is-center", c === best);
  }, [cells]);

  const scrollToIdx = useCallback(
    (i: number, smooth: boolean) => {
      const r = row.current;
      const c = cells()[i];
      if (!r || !c) return;
      r.scrollTo({ left: c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2, behavior: smooth && !calm() ? "smooth" : "auto" });
    },
    [cells],
  );

  // Endlos-Schleife: nach dem Wischen unsichtbar zurück in die mittlere Reihe springen
  const wrap = useCallback(() => {
    const r = row.current;
    if (!r || !carousel() || n === 0) return;
    const all = cells();
    const i = centerIndex();
    const copy = Math.floor(i / n);
    if (i < 0 || copy === MID || !all[n]) return;
    const width = all[n].offsetLeft - all[0].offsetLeft;
    r.scrollLeft += (MID - copy) * width;
  }, [cells, centerIndex, n]);

  // Ring in der Mitte melden (nur wenn er wechselt). Ohne Rondell gilt Readiness.
  const lastKey = useRef<string | null>(null);
  const report = useCallback(() => {
    const i = carousel() ? centerIndex() : -1;
    const key = (i >= 0 ? cells()[i]?.dataset.key : null) ?? "readiness";
    if (key !== lastKey.current) {
      lastKey.current = key;
      centerCb.current?.(key);
    }
  }, [carousel, centerIndex, cells]);

  // Rondell oder alle nebeneinander, je nach Platz
  useLayoutEffect(() => {
    setStatic(!carousel());
  }, [carousel]);

  // Beim Öffnen, beim Tageswechsel und beim Umschalten des Modus steht Readiness in der Mitte
  useLayoutEffect(() => {
    if (carousel()) {
      scrollToIdx(MID * n + mainIdx, false);
      paint();
    }
    report();
  }, [day, n, mainIdx, isStatic, carousel, scrollToIdx, paint, report]);

  useEffect(() => {
    const r = row.current;
    if (!r) return;
    const settle = () => {
      clearTimeout(idle.current);
      wrap();
      paint();
      report();
    };
    const onScroll = () => {
      if (!calm()) {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(paint);
      }
      clearTimeout(idle.current);
      idle.current = setTimeout(settle, IDLE_MS);
    };
    const onResize = () => {
      const c = carousel();
      setStatic(!c);
      if (c) scrollToIdx(centerIndex() < 0 ? MID * n + mainIdx : centerIndex(), false);
      paint();
      report();
    };
    r.addEventListener("scroll", onScroll, { passive: true });
    r.addEventListener("scrollend", settle);
    window.addEventListener("resize", onResize);
    return () => {
      r.removeEventListener("scroll", onScroll);
      r.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame.current);
      clearTimeout(idle.current);
    };
  }, [wrap, paint, report, carousel, scrollToIdx, centerIndex, n, mainIdx]);

  // Äußerer Ring: erst in die Mitte drehen. Mittlerer Ring: Detailseite öffnen.
  const onTap = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    if (!carousel() || centerIndex() === i) return;
    e.preventDefault();
    scrollToIdx(i, true);
  };

  // Mit Tastatur oder VoiceOver: der fokussierte Ring wandert in die Mitte
  const onFocus = (e: FocusEvent<HTMLAnchorElement>, i: number) => {
    if (carousel() && e.currentTarget.matches(":focus-visible") && centerIndex() !== i) scrollToIdx(i, true);
  };

  return (
    <section className="ring-strip-wrap" aria-label="Dein Tag" ref={wrapRef}>
      <div className={"ring-strip" + (isStatic ? " is-static" : "")} ref={row}>
        {Array.from({ length: COPIES }, (_, c) =>
          items.map((it, j) => {
            const i = c * n + j;
            const real = c === MID;
            return (
              <Link
                key={`${c}-${it.key}`}
                href={it.href}
                data-key={it.key}
                className={"ring-strip-cell" + (it.main ? " is-main" : "") + (real ? "" : " is-copy")}
                aria-label={`${it.aria}. Details öffnen`}
                aria-hidden={real ? undefined : true}
                tabIndex={real ? undefined : -1}
                onClick={(e) => onTap(e, i)}
                onFocus={(e) => onFocus(e, i)}
              >
                <span className="ring-strip-label">{it.label}</span>
                <span className="ring-strip-ring">
                  <ValueRing tone={it.tone} size={120} value={it.value} split={it.split} target={it.target} center={it.center} caption={it.word} label={it.aria} />
                </span>
              </Link>
            );
          }),
        )}
      </div>
    </section>
  );
}
