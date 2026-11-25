"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAnsicht } from "@/lib/ansicht";
import { isoDay } from "@/lib/dates";
import { hm } from "@/lib/today";
import { loadToPct } from "@/lib/alltagslast";
import { sportOf, SPORTS, type Sport } from "@/lib/training";
import type { Activity } from "@/lib/garmin";
import SportIcon from "@/components/ui/SportIcon";
import { Pille, PillenZeile } from "@/components/ui/Pille";

// „Alle Aktivitäten“ am Ende von Training (Konzept docs/konzept-einfach.md, Paket 2):
// alle Einheiten, neueste oben, nach Woche gruppiert, Filter nach Sportart (gemerkt) und Suche.
// Garmin-Einheiten öffnen die Einheit. Selbst erfasste Einheiten ohne Uhr stehen ohne Link dabei.

type Zeile = {
  key: string;
  day: string;
  time: string | null;
  sport: Sport;
  titel: string;
  dauerH: number | null;
  last: number | null; // Belastung in %
  href: string | null;
  suche: string;
};

const SPORT_REIHE: Sport[] = ["karate", "kettlebell", "klettern", "ausdauer", "sonstiges"];
const SCHRITT = 20;
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const mittag = (d: string) => new Date(d + "T12:00:00");
function montag(day: string): string {
  const d = mittag(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}
function kw(day: string): number {
  const d = mittag(day);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round((d.getTime() - jan4.getTime()) / 864e5 / 7 - 3 / 7 + ((jan4.getDay() + 6) % 7) / 7);
}
const kurz = (d: string) => mittag(d).toLocaleDateString("de-DE", { day: "numeric", month: "short" });

function wochenTitel(mo: string, heute: string): string {
  const diese = montag(heute);
  if (mo === diese) return "Diese Woche";
  const letzte = new Date(mittag(diese));
  letzte.setDate(letzte.getDate() - 7);
  if (mo === isoDay(letzte)) return "Letzte Woche";
  const so = mittag(mo);
  so.setDate(so.getDate() + 6);
  return `KW ${kw(mo)} · ${kurz(mo)} – ${kurz(isoDay(so))}`;
}

function wann(day: string, heute: string): string {
  if (day === heute) return "heute";
  const diff = Math.round((mittag(heute).getTime() - mittag(day).getTime()) / 864e5);
  if (diff === 1) return "gestern";
  return `${WT[mittag(day).getDay()]} ${kurz(day)}`;
}

export default function AlleAktivitaeten() {
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useAnsicht<Sport[]>("training.aktivitaeten", []);
  const [suche, setSuche] = useState("");
  const [anzahl, setAnzahl] = useState(SCHRITT);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    Promise.all([
      sb.from("garmin_activities").select("*").order("start_local", { ascending: false }).limit(3000),
      sb.from("planned_sessions").select("id, day, sport, time, duration_min, note").eq("status", "erledigt").order("day", { ascending: false }).limit(3000),
    ]).then(([a, p]) => {
      if (a.error) {
        setError("Aktivitäten konnten nicht geladen werden: " + a.error.message);
        return;
      }
      const acts = ((a.data ?? []) as Activity[]).filter((x) => x.start_local && x.sport_override !== "ignorieren");
      const garminTage = new Set(acts.map((x) => `${(x.start_local as string).slice(0, 10)}|${sportOf(x)}`));
      const rows: Zeile[] = acts.map((x) => {
        const sport = sportOf(x);
        const titel = x.sport_label || (sport === "sonstiges" && x.name ? x.name : SPORTS[sport].label);
        return {
          key: `g${x.activity_id}`,
          day: (x.start_local as string).slice(0, 10),
          time: (x.start_local as string).slice(11, 16) || null,
          sport,
          titel,
          dauerH: x.duration_s ? x.duration_s / 3600 : null,
          last: x.training_load ? Math.round(loadToPct(x.training_load)) : null,
          href: `/training/einheit/${x.activity_id}`,
          suche: `${titel} ${x.name ?? ""} ${SPORTS[sport].label}`.toLowerCase(),
        };
      });
      // Selbst erfasste Einheiten nur, wenn Garmin an dem Tag nichts von dieser Sportart hat (sonst doppelt)
      for (const s of (p.error ? [] : p.data ?? []) as { id: string; day: string; sport: Sport; time: string | null; duration_min: number | null; note: string | null }[]) {
        if (garminTage.has(`${s.day}|${s.sport}`) || !SPORTS[s.sport]) continue;
        rows.push({
          key: `p${s.id}`,
          day: s.day,
          time: s.time,
          sport: s.sport,
          titel: SPORTS[s.sport].label,
          dauerH: s.duration_min ? s.duration_min / 60 : null,
          last: null,
          href: null,
          suche: `${SPORTS[s.sport].label} ${s.note ?? ""}`.toLowerCase(),
        });
      }
      rows.sort((x, y) => `${y.day}${y.time ?? ""}`.localeCompare(`${x.day}${x.time ?? ""}`));
      setZeilen(rows);
    });
  }, []);

  // Vom Link „Alle ›“ auf Heute hierher springen, sobald die Liste steht
  useEffect(() => {
    if (zeilen && window.location.hash === "#aktivitaeten") document.getElementById("aktivitaeten")?.scrollIntoView({ block: "start" });
  }, [zeilen]);

  const vorhanden = useMemo(() => SPORT_REIHE.filter((s) => zeilen?.some((z) => z.sport === s)), [zeilen]);
  const aktiv = new Set(filter.filter((s) => vorhanden.includes(s)));
  const q = suche.trim().toLowerCase();
  const treffer = (zeilen ?? []).filter((z) => (!aktiv.size || aktiv.has(z.sport)) && (!q || z.suche.includes(q)));
  const sichtbar = treffer.slice(0, anzahl);

  const heute = isoDay();
  const wochen: { mo: string; zeilen: Zeile[] }[] = [];
  for (const z of sichtbar) {
    const mo = montag(z.day);
    if (wochen[wochen.length - 1]?.mo !== mo) wochen.push({ mo, zeilen: [] });
    wochen[wochen.length - 1].zeilen.push(z);
  }
  // Summe je Woche über alle Treffer, nicht nur die sichtbaren
  const summe = (mo: string) => {
    const w = treffer.filter((z) => montag(z.day) === mo);
    const h = w.reduce((s, z) => s + (z.dauerH ?? 0), 0);
    return `${w.length} ${w.length === 1 ? "Einheit" : "Einheiten"}${h ? ` · ${hm(h)}` : ""}`;
  };

  const umschalten = (s: Sport) => {
    const next = new Set(aktiv);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setFilter([...next]);
    setAnzahl(SCHRITT);
  };

  return (
    <section id="aktivitaeten" className="card alle-akt" aria-label="Alle Aktivitäten">
      <h2>Alle Aktivitäten</h2>
      {error && <p className="alert" role="alert">{error}</p>}
      {zeilen && zeilen.length === 0 && <p className="meta">Noch keine Einheiten. Sobald Garmin Aktivitäten liefert oder du eine Einheit erfasst, stehen sie hier.</p>}
      {zeilen && zeilen.length > 0 && (
        <>
          <PillenZeile label="Nach Sportart filtern" scroll>
            <Pille an={aktiv.size === 0} onClick={() => { setFilter([]); setAnzahl(SCHRITT); }}>
              Alle
            </Pille>
            {vorhanden.map((s) => (
              <Pille key={s} an={aktiv.has(s)} farbe={SPORTS[s].color} onClick={() => umschalten(s)}>
                {SPORTS[s].label}
              </Pille>
            ))}
          </PillenZeile>
          <input
            className="input alle-akt-suche"
            type="search"
            placeholder="Suchen, z. B. Laufen"
            value={suche}
            onChange={(e) => { setSuche(e.target.value); setAnzahl(SCHRITT); }}
            aria-label="Aktivitäten durchsuchen"
          />
          {treffer.length === 0 && <p className="meta">Keine Einheit passt zu Filter und Suche.</p>}
          {wochen.map((w) => (
            <div key={w.mo} className="alle-akt-woche">
              <div className="alle-akt-kopf">
                <span>{wochenTitel(w.mo, heute)}</span>
                <span>{summe(w.mo)}</span>
              </div>
              {w.zeilen.map((z) => {
                const teile = [wann(z.day, heute)];
                if (z.dauerH) teile.push(hm(z.dauerH));
                if (z.last !== null) teile.push(`Belastung ${z.last} %`);
                if (!z.href) teile.push("selbst erfasst");
                const inhalt = (
                  <>
                    <span className="today-act-icon is-training" aria-hidden="true">
                      <SportIcon sport={z.sport} size={20} />
                    </span>
                    <span className="today-act-text">
                      <span className="today-act-title">{z.titel}</span>
                      <span className="today-act-sub">{teile.join(" · ")}</span>
                    </span>
                    {z.href && <span className="today-act-chev" aria-hidden="true">›</span>}
                  </>
                );
                return z.href ? (
                  <Link key={z.key} href={z.href} className="today-act">
                    {inhalt}
                  </Link>
                ) : (
                  <div key={z.key} className="today-act">
                    {inhalt}
                  </div>
                );
              })}
            </div>
          ))}
          {treffer.length > anzahl && (
            <button type="button" className="btn btn-quiet" onClick={() => setAnzahl(anzahl + SCHRITT)}>
              Weitere laden ({treffer.length - anzahl})
            </button>
          )}
        </>
      )}
    </section>
  );
}
