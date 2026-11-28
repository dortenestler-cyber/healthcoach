"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSettings, saveSettings } from "@/lib/training";
import { DEFAULT_FACTORS, DEFAULT_WATER_GOAL, DEFAULT_WATER_GOAL_TRAINING, factorsFrom, fmtAmount, type DrinkFactors } from "@/lib/drinks";

// Wasserziel in Litern: normal und an Trainingstagen (settings.data.waterGoal, waterGoalTraining)
export default function WaterGoalRows() {
  const [goal, setGoal] = useState(DEFAULT_WATER_GOAL);
  const [goalTr, setGoalTr] = useState(DEFAULT_WATER_GOAL_TRAINING);
  const [factors, setFactors] = useState<DrinkFactors>(DEFAULT_FACTORS);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadSettings(sb).then((s) => {
      if (typeof s.waterGoal === "number") setGoal(s.waterGoal);
      if (typeof s.waterGoalTraining === "number") setGoalTr(s.waterGoalTraining);
      setFactors(factorsFrom(s));
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

  // Anrechnung in Prozent, 10er-Schritte
  const saveFactor = async (key: keyof DrinkFactors, value: number) => {
    const v = Math.max(0, Math.min(1, Math.round(value * 10) / 10));
    const next = { ...factors, [key]: v };
    setFactors(next);
    const sb = supabase();
    if (!sb) return;
    const s = await loadSettings(sb);
    const { error: e } = await saveSettings(sb, { ...s, drinkFactors: next });
    setError(e ? "Speichern hat nicht geklappt: " + e.message : "");
  };
  const factorLine = (label: string, key: keyof DrinkFactors) => (
    <div className="settings-row">
      <span className="row-label">{label}</span>
      <div className="stepper">
        <button type="button" aria-label={label + " senken"} onClick={() => saveFactor(key, factors[key] - 0.1)}>−</button>
        <span>{Math.round(factors[key] * 100)} %</span>
        <button type="button" aria-label={label + " erhöhen"} onClick={() => saveFactor(key, factors[key] + 0.1)}>+</button>
      </div>
    </div>
  );

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
      {factorLine("Kaffee zählt zum Ziel", "kaffee")}
      {factorLine("Tee zählt zum Ziel", "tee")}
      {factorLine("Alkohol zählt zum Ziel", "alkohol")}
      <p className="settings-note">Eine Tasse oder ein Glas sind 0,2 L. Die Prozentwerte sind Schätzungen ohne Quelle.</p>
      {error && <p className="settings-note" role="status">{error}</p>}
    </>
  );
}
