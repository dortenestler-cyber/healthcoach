"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTablet } from "@/lib/layout";
import { clock, greeting, longDate, shiftDay } from "@/lib/dates";

const WEEKDAY = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// Kopf von Heute (Konzept Heute als Einstiegsseite, nach Sonar): Gruß nach Tageszeit, darunter das Datum mit ‹ ›.
// Zurückblättern zeigt einen früheren Tag mit denselben Ringen.
// Der Stand des Garmin-Abrufs steht als Punkt am Zahnrad: kein Punkt bis 30 Minuten, grau bis 1 Stunde, Amber danach oder bei Fehler.
export function syncState(lastSync: number, failed: boolean, now: number): { level: "frisch" | "alt" | "veraltet"; text: string } {
  const stand = lastSync ? `Garmin-Daten von ${clock(new Date(lastSync))}` : "Noch keine Garmin-Daten";
  if (failed) return { level: "veraltet", text: stand + ", letzter Abruf hat nicht geklappt" };
  const age = lastSync ? now - lastSync : Infinity;
  if (age <= 30 * 60000) return { level: "frisch", text: stand + ", aktuell" };
  if (age <= 60 * 60000) return { level: "alt", text: stand + ", älter als 30 Minuten" };
  return { level: "veraltet", text: stand + ", älter als 1 Stunde" };
}

export default function DayHead({ day, today, lastSync, failed = false, onDay, onRefresh, busy = false }: { day: string; today: string; lastSync: number; failed?: boolean; onDay: (d: string) => void; onRefresh?: () => void; busy?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const tablet = useTablet();
  // Am Computer: ← → wechselt den Tag (nicht in Eingabefeldern)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable || t.closest("svg.cb-pickable"))) return;
      if (e.key === "ArrowLeft") onDay(shiftDay(day, -1));
      else if (e.key === "ArrowRight" && day < today) onDay(shiftDay(day, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, today, onDay]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const sync = syncState(lastSync, failed, now);
  const isToday = day === today;
  const date = new Date(day + "T12:00:00");
  const title = isToday ? greeting() : day === shiftDay(today, -1) ? "Gestern" : WEEKDAY[date.getDay()];

  return (
    <header className="page-head day-head">
      <div className="page-glow" data-tone="heute" aria-hidden="true" />
      <div className="page-head-row">
        <div className="page-head-text">
          <h1 className="page-title">{title}</h1>
          <div className="today-date">
            <button type="button" className="today-date-btn" aria-label="Tag davor" onClick={() => onDay(shiftDay(day, -1))}>
              <Chevron dir="l" />
            </button>
            <Link href={`/kalender?von=heute&tag=${day}`} className="today-date-text today-date-link" aria-label={`${longDate(date)}, Kalender öffnen`}>
              {longDate(date)}
            </Link>
            <button type="button" className="today-date-btn" aria-label="Tag danach" disabled={isToday} onClick={() => onDay(shiftDay(day, 1))}>
              <Chevron dir="r" />
            </button>
          </div>
          {!isToday && (
            <button type="button" className="day-back" onClick={() => onDay(today)}>
              Zurück zu heute
            </button>
          )}
        </div>
        {tablet && onRefresh && (
          <button type="button" className="btn btn-soft refresh-btn" onClick={onRefresh} disabled={busy} title={sync.text}>
            {busy ? "Aktualisiere …" : "↻ Aktualisieren"}
          </button>
        )}
        <Link href="/einstellungen" className="gear-btn" aria-label={`Einstellungen · ${sync.text}`} title={sync.text}>
          {sync.level !== "frisch" && <span className="sync-dot" data-level={sync.level} aria-hidden="true" />}
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

function Chevron({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "l" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
