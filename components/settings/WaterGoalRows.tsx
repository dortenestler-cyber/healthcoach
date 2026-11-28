"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSettings, saveSettings } from "@/lib/training";
import { DEFAULT_WATER_GOAL, DEFAULT_WATER_GOAL_TRAINING, fmtAmount } from "@/lib/drinks";

// Wasserziel in Litern: normal und an Trainingstagen (settings.data.waterGoal, waterGoalTraining)
export default function WaterGoalRows() {
  const [goal, setGoal] = useState(DEFAULT_WATER_GOAL);
  const [goalTr, setGoalTr] = useState(DEFAULT_WATER_GOAL_TRAINING);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadSettings(sb).then((s) => {
      if (typeof s.waterGoal === "number") setGoal(s.waterGoal);
      if (typeof s.waterGoalTraining === "number") setGoalTr(s.waterGoalTraining);
    });
  }, []);

  const save = async (key: "waterGoal" | "waterGoalTraining", value: number) => {
    const v = Math.max(0.5, Math.min(6, Math.round(value * 4) / 4));
    if (key === "waterGoal") setGoal(v);
    else setGoalTr(v);
    const sb = supabase();
    if (!sb) return;
    const s = await loadSettings(sb);
    const { error: e } = await saveSettings(sb, { ...s, [key]: v });
    setError(e ? "Speichern hat nicht geklappt: " + e.message : "");
  };

  const line = (label: string, key: "waterGoal" | "waterGoalTraining", value: number) => (
    <div className="settings-row">
      <span className="row-label">{label}</span>
      <div className="stepper">
        <button type="button" aria-label={label + " senken"} onClick={() => save(key, value - 0.25)}>−</button>
        <span>{fmtAmount(value)} L</span>
        <button type="button" aria-label={label + " erhöhen"} onClick={() => save(key, value + 0.25)}>+</button>
      </div>
    </div>
  );

  return (
    <>
      {line("Wasserziel", "waterGoal", goal)}
      {line("Wasserziel an Trainingstagen", "waterGoalTraining", goalTr)}
      {error && <p className="settings-note" role="status">{error}</p>}
    </>
  );
}
