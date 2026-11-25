"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coachContext";
import { getCoachPrefs } from "@/lib/prefs";
import { loadSettings, saveSettings } from "@/lib/training";

// Texte vom Coach (Claude) für Heute und „Dein Monat“ (Logbuch 25.11., Variante A).
// Einmal am Tag geschrieben, gespeichert in settings.data.briefing, auf Wunsch neu.
// Läuft über die bestehende Funktion „coach“ (zählt zum Tageslimit, steht im Coach-Verlauf).
// Ist der Coach aus oder schlägt der Aufruf fehl, zeigt die Seite ihren Text nach festen Regeln.

export type BriefingArt = "tag" | "monat";
type Gespeichert = { key: string; text: string; erstellt: string };

const laufend = new Map<string, Promise<string>>(); // doppelte Aufrufe beim Neuzeichnen vermeiden

async function fragen(art: BriefingArt, key: string, frage: string, zusatz: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("Keine Verbindung");
  const ctx = await buildCoachContext().catch(() => "");
  const { data, error } = await sb.functions.invoke("coach", { body: { message: frage, context: (zusatz ? zusatz + "\n" : "") + ctx, limit: getCoachPrefs().dailyLimit } });
  let detail = (data as { error?: string } | null)?.error;
  if (error) {
    detail = error.message;
    try {
      const res = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") detail = (await res.json())?.error ?? detail;
    } catch {
      // Standardtext behalten
    }
  }
  const text = (data as { answer?: string } | null)?.answer?.trim();
  if (detail || !text) throw new Error(detail ?? "keine Antwort");
  // Frisch laden und nur den eigenen Teil ersetzen
  const s = await loadSettings(sb);
  const b = ((s.briefing ?? {}) as Record<string, Gespeichert>);
  await saveSettings(sb, { ...s, briefing: { ...b, [art]: { key, text, erstellt: new Date().toISOString() } } });
  return text;
}

// key: wofür der Text gilt (Tag als ISO-Datum). frage null = (noch) nicht fragen.
export function useBriefing(art: BriefingArt, key: string, frage: string | null, zusatz = "") {
  const [text, setText] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const coachAn = getCoachPrefs().on;

  const holen = useCallback(
    async (neu: boolean) => {
      const sb = supabase();
      if (!sb || !frage || !coachAn) return;
      setFehler("");
      if (!neu) {
        const s = await loadSettings(sb);
        const g = ((s.briefing ?? {}) as Record<string, Gespeichert>)[art];
        if (g && g.key === key) return setText(g.text);
      }
      const id = `${art}|${key}|${neu ? Date.now() : ""}`;
      if (!laufend.has(id)) laufend.set(id, fragen(art, key, frage, zusatz).finally(() => setTimeout(() => laufend.delete(id), 1000)));
      setLaedt(true);
      try {
        setText(await laufend.get(id)!);
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
      } finally {
        setLaedt(false);
      }
    },
    [art, key, frage, zusatz, coachAn],
  );

  useEffect(() => {
    holen(false);
  }, [holen]);

  return { text, laedt, fehler, coachAn, neu: () => holen(true) };
}
