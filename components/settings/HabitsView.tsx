"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import PageHead from "@/components/PageHead";
import { Group, Toggle } from "@/components/SettingsView";
import { supabase } from "@/lib/supabase";
import { DEFAULT_HABITS, HAS_DETAILS, habitKey, loadHabits, saveHabits, type Habit } from "@/lib/habits";

// Gewohnheiten verwalten: ein- und ausblenden, Reihenfolge, eigene Gewohnheiten.
// Ausgeblendet heißt nur: nicht im Tagebuch angezeigt. Alte Einträge bleiben erhalten.
export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadHabits(sb)
      .then((h) => {
        setHabits(h);
        setLoaded(true);
      })
      .catch((e) => setError("Gewohnheiten konnten nicht geladen werden: " + (e instanceof Error ? e.message : String(e))));
  }, []);

  const store = async (next: Habit[]) => {
    const sb = supabase();
    if (!sb) return;
    const before = habits;
    setHabits(next);
    const e = await saveHabits(sb, next);
    if (e) {
      setHabits(before);
      setError("Das hat nicht geklappt: " + e);
    } else setError("");
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= habits.length) return;
    const next = [...habits];
    [next[i], next[j]] = [next[j], next[i]];
    store(next);
  };

  const add = (ev: FormEvent) => {
    ev.preventDefault();
    const label = name.trim().slice(0, 40);
    if (!label) return;
    const key = habitKey(label);
    if (habits.some((h) => h.key === key || h.label.toLowerCase() === label.toLowerCase())) {
      setError(`„${label}“ gibt es schon.`);
      return;
    }
    setName("");
    store([...habits, { key, label, on: true, custom: true }]);
  };

  return (
    <>
      <Link href="/tagebuch" className="back-link">‹ Tagebuch</Link>
      <PageHead title="Gewohnheiten" sub="Einstellungen" />
      {error && <p className="alert" role="alert">{error}</p>}
      <Group title="Im Tagebuch">
        {habits.map((h, i) => (
          <div key={h.key} className="habit-manage-row">
            <div className="habit-move">
              <button type="button" className="icon-btn" aria-label={`${h.label} nach oben`} disabled={!loaded || i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="icon-btn" aria-label={`${h.label} nach unten`} disabled={!loaded || i === habits.length - 1} onClick={() => move(i, 1)}>↓</button>
            </div>
            <div className="habit-manage-toggle">
              <Toggle
                label={h.label}
                note={HAS_DETAILS.has(h.key) ? "mit Details: Gänge, Wann, Kältebecken" : h.custom ? "eigene · ja oder nein" : "ja oder nein"}
                on={h.on}
                disabled={!loaded}
                onChange={() => store(habits.map((x) => (x.key === h.key ? { ...x, on: !x.on } : x)))}
              />
            </div>
            {h.custom && (
              <button type="button" className="icon-btn" aria-label={`${h.label} entfernen`} disabled={!loaded} onClick={() => { if (window.confirm(`„${h.label}“ entfernen? Alte Einträge bleiben erhalten.`)) store(habits.filter((x) => x.key !== h.key)); }}>
                ×
              </button>
            )}
          </div>
        ))}
        <p className="settings-note">Ausgeblendete Gewohnheiten verschwinden nur aus dem Tagebuch. Alte Einträge bleiben erhalten und zählen in der Auswertung weiter.</p>
      </Group>
      <Group title="Eigene Gewohnheit">
        <form className="habit-add" onSubmit={add}>
          <label htmlFor="habit-name" className="sr-only">Name der Gewohnheit</label>
          <input id="habit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Kältebad, Meditation" maxLength={40} />
          <button type="submit" className="btn btn-primary" disabled={!loaded || !name.trim()}>Hinzufügen</button>
        </form>
      </Group>
    </>
  );
}
