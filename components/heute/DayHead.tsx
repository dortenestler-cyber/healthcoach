import Link from "next/link";
import { clock, greeting, longDate, shiftDay } from "@/lib/dates";

const WEEKDAY = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// Kopf von Heute (Konzept Heute als Einstiegsseite, nach Sonar): Gruß nach Tageszeit, darunter das Datum mit ‹ ›.
// Zurückblättern zeigt einen früheren Tag mit denselben Ringen. Darunter der Stand des Garmin-Abrufs.
export default function DayHead({ day, today, lastSync, onDay }: { day: string; today: string; lastSync: number; onDay: (d: string) => void }) {
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
            <span className="today-date-text">{longDate(date)}</span>
            <button type="button" className="today-date-btn" aria-label="Tag danach" disabled={isToday} onClick={() => onDay(shiftDay(day, 1))}>
              <Chevron dir="r" />
            </button>
          </div>
          {isToday ? (
            <span className="day-stand">{lastSync ? `Garmin · Stand ${clock(new Date(lastSync))} · nach unten ziehen zum Aktualisieren` : "Nach unten ziehen zum Aktualisieren"}</span>
          ) : (
            <button type="button" className="day-back" onClick={() => onDay(today)}>
              Zurück zu heute
            </button>
          )}
        </div>
        <Link href="/einstellungen" className="gear-btn" aria-label="Einstellungen">
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
