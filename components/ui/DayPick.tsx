"use client";

// Tag wählen (Sammelliste Punkt 18): Heute · Gestern · Vorgestern · Datum. Für Nachtragen von Krankheit, Verletzung und Ende.
// Datum: natives Datumsfeld, nie in der Zukunft, nie vor min.

import { useId } from "react";
import { isoDay, shiftDay } from "@/lib/dates";

type Props = {
  label: string;
  value: string; // ISO-Tag
  onChange: (day: string) => void;
  min?: string; // frühester erlaubter Tag, z. B. Beginn bei der Wahl des Endes
};

export default function DayPick({ label, value, onChange, min }: Props) {
  const id = useId();
  const today = isoDay();
  const quick = [
    { day: today, text: "Heute" },
    { day: shiftDay(today, -1), text: "Gestern" },
    { day: shiftDay(today, -2), text: "Vorgestern" },
  ].filter((q) => !min || q.day >= min);
  const isQuick = quick.some((q) => q.day === value);
  return (
    <div className="day-pick" role="group" aria-labelledby={id}>
      <span id={id} className="label">{label}</span>
      <div className="pills wrap">
        {quick.map((q) => (
          <button key={q.day} type="button" className="pill pill-sm" aria-pressed={value === q.day} onClick={() => onChange(q.day)}>
            {q.text}
          </button>
        ))}
        <input
          type="date"
          className={`input day-pick-date${isQuick ? "" : " is-set"}`}
          value={value}
          min={min}
          max={today}
          aria-label={`${label}: Datum wählen`}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
