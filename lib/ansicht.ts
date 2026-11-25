"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSettings, saveSettings } from "@/lib/training";

// Gemerkte Ansicht: welche Pillen an sind, welche Details offen, welche Abschnitte sichtbar
// (Konzept docs/konzept-einfach.md, Paket 1). Liegt in settings.data.ansicht und gilt damit
// auf iPhone und Computer gleich. Eine Kopie im Gerät sorgt dafür, dass die Seite sofort
// richtig aussieht, bevor Supabase antwortet.

type Ansicht = Record<string, unknown>;

const LOCAL = "hc-ansicht";
const EVENT = "hc-ansicht";
let cache: Ansicht | null = null;
let geladen = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const geaendert = new Set<string>(); // Schlüssel, die hier geändert und noch nicht gespeichert sind

function lokal(): Ansicht {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(LOCAL) ?? "{}") as Ansicht;
  } catch {
    cache = {};
  }
  return cache;
}

function merken() {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(cache ?? {}));
  } catch {
    // Speicher gesperrt: gilt dann bis zum Neuladen
  }
  window.dispatchEvent(new Event(EVENT));
}

// Einmal pro Sitzung den Stand aus Supabase holen; dort Gespeichertes gilt, außer es wurde hier gerade geändert
function vomServer() {
  if (geladen) return;
  geladen = true;
  const sb = supabase();
  if (!sb) return;
  loadSettings(sb).then((s) => {
    const server = (s.ansicht ?? {}) as Ansicht;
    const hier = lokal();
    const neu: Ansicht = { ...hier };
    for (const [k, v] of Object.entries(server)) if (!geaendert.has(k)) neu[k] = v;
    cache = neu;
    merken();
  });
}

// Gesammelt speichern, damit schnelles Tippen nur einen Schreibvorgang auslöst
function spaeterSpeichern() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const sb = supabase();
    if (!sb) return;
    const keys = [...geaendert];
    geaendert.clear();
    const s = await loadSettings(sb);
    const ansicht = { ...((s.ansicht ?? {}) as Ansicht) };
    for (const k of keys) ansicht[k] = lokal()[k];
    await saveSettings(sb, { ...s, ansicht });
  }, 800);
}

// Liest einen gemerkten Wert. Ohne Eintrag gilt der Startwert.
export function useAnsicht<T>(key: string, start: T): [T, (v: T) => void] {
  const [wert, setWert] = useState<T>(start);

  useEffect(() => {
    const lesen = () => {
      const v = lokal()[key];
      setWert(v === undefined ? start : (v as T));
    };
    lesen();
    vomServer();
    window.addEventListener(EVENT, lesen);
    return () => window.removeEventListener(EVENT, lesen);
    // start nur beim ersten Mal, sonst springt die Ansicht bei jedem Neuzeichnen zurück
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setzen = useCallback(
    (v: T) => {
      lokal()[key] = v;
      geaendert.add(key);
      setWert(v);
      merken();
      spaeterSpeichern();
    },
    [key],
  );

  return [wert, setzen];
}
