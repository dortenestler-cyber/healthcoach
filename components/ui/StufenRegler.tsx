"use client";

import { useId } from "react";

// Schieberegler mit einrastenden Stufen (Check-in und Check-out, 5 Stufen).
// Ohne Antwort (value null) steht der Griff gedimmt in der Mitte und das Wort ist ein Strich.
// Als Antwort zählt erst das Loslassen, Antippen oder eine Pfeiltaste, nicht die Voreinstellung.
type Props = { label: string; levels: string[]; value: number | null; onChange: (v: number) => void; onCommit?: (v: number) => void };

export default function StufenRegler({ label, levels, value, onChange, onCommit }: Props) {
  const id = useId();
  const mid = Math.ceil(levels.length / 2);
  const commit = (el: HTMLInputElement) => {
    const v = Number(el.value);
    if (v !== value) onChange(v);
    onCommit?.(v);
  };
  return (
    <div className="stufen">
      <div className="stufen-head">
        <label htmlFor={id} className="row-label">{label}</label>
        <span className={value === null ? "stufen-wort stufen-leer" : "stufen-wort"} aria-live="polite">{value === null ? "–" : levels[value - 1]}</span>
      </div>
      <input
        id={id}
        type="range"
        className={value === null ? "stufen-regler stufen-leer" : "stufen-regler"}
        min={1}
        max={levels.length}
        step={1}
        value={value ?? mid}
        aria-valuetext={value === null ? "keine Angabe" : levels[value - 1]}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => commit(e.currentTarget)}
        onKeyUp={(e) => commit(e.currentTarget)}
      />
      <div className="stufen-ticks" aria-hidden="true">
        {levels.map((l, i) => <span key={l} className={value === i + 1 ? "stufen-tick stufen-tick-on" : "stufen-tick"} />)}
      </div>
    </div>
  );
}
