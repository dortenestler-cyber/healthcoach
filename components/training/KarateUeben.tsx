"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSettings, saveSettings } from "@/lib/training";
import { NEXT, STATUS_WORT, stand, type Punkt, type Status } from "@/lib/karate/programm";
import { uebenFuer, type KarateMerk } from "@/lib/karate/ueben";

// „Heute üben“ (Heute, Karate-Seite) und „Was saß heute?“ (nach einer Karate-Einheit), Konzept Einfach, Paket 9.
// Ein Tipp setzt die Stufe weiter (offen → übe ich → sitzt) und merkt sich den Tag als „zuletzt dran“.
const MARK: Record<Status, string> = { offen: "", uebe: "◐", sitzt: "✓" };

function useUeben(tag: string, merken: boolean, onChanged?: () => void) {
  const [punkte, setPunkte] = useState<Punkt[] | null>(null);
  const [progress, setProgress] = useState<Map<string, Status>>(new Map());
  const [kyu, setKyu] = useState(5);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [s, pr, inj] = await Promise.all([loadSettings(sb), sb.from("karate_progress").select("item_key, status"), sb.from("injuries").select("id").is("ended_on", null)]);
    if (pr.error) return setError("Karate konnte nicht geladen werden: " + pr.error.message);
    const m = new Map(((pr.data ?? []) as { item_key: string; status: Status }[]).map((r) => [r.item_key, r.status]));
    const merk = (s.karate ?? {}) as KarateMerk;
    setKyu(Math.max(merk.ziel ?? 5, 1));
    setProgress(m);
    const { punkte: p, neu } = uebenFuer(tag, merk, m, (inj.data ?? []).length > 0);
    setPunkte(p);
    // Die Auswahl des Tages festhalten, damit Heute und „Was saß heute?“ dieselben Punkte zeigen
    if (neu && p.length && merken) await saveSettings(sb, { ...s, karate: { ...merk, ueben: { tag, keys: p.map((x) => x.key) } } });
  }, [tag, merken]);

  useEffect(() => {
    load();
  }, [load]);

  const setze = async (p: Punkt) => {
    const sb = supabase();
    if (!sb) return;
    const next = NEXT[stand(p, progress)];
    setProgress((m) => new Map(m).set(p.key, next));
    const { error: e } = await sb.from("karate_progress").upsert({ item_key: p.key, status: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,item_key" });
    if (e) return setError("Das wurde nicht gespeichert: " + e.message);
    const s = await loadSettings(sb);
    const merk = (s.karate ?? {}) as KarateMerk;
    await saveSettings(sb, { ...s, karate: { ...merk, zuletzt: { ...(merk.zuletzt ?? {}), [p.key]: tag } } });
    setError("");
    onChanged?.();
  };

  return { punkte, progress, kyu, error, setze };
}

// Eine Zeile für Heute › Heute steht an: die Punkte als Satz, Tipp öffnet die Karate-Seite
export function KarateUebenZeile({ tag }: { tag: string }) {
  const { punkte } = useUeben(tag, true);
  if (!punkte?.length) return null;
  return (
    <Link href="/training/karate" className="link-small karate-ueben-zeile">
      Heute üben: {punkte.slice(0, 2).map((p) => p.name.replace(/^\d+\.\s*/, "").replace(/,.*$/, "")).join(", ")}
      {punkte.length > 2 ? ` und ${punkte.length - 2} weitere` : ""} ›
    </Link>
  );
}

export default function KarateUeben({ tag, art, onChanged }: { tag: string; art: "heute" | "naechstes" | "nachher"; onChanged?: () => void }) {
  const { punkte, progress, kyu, error, setze } = useUeben(tag, art !== "naechstes", onChanged);
  if (!punkte) return null;
  const titel = art === "nachher" ? "Was saß heute?" : art === "heute" ? "Heute üben" : "Als Nächstes üben";
  return (
    <section className="card karate-ueben" aria-label={titel}>
      <div className="card-row">
        <h2>{titel}</h2>
        <span className="meta">{kyu}. Kyu</span>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {!punkte.length ? (
        <p className="meta">Für den {kyu}. Kyu sitzt alles. Wiederhole, was du magst.</p>
      ) : (
        <>
          {punkte.map((p) => {
            const st = stand(p, progress);
            return (
              <div key={p.key} className="kp-row">
                <button type="button" className="kp-check" data-state={st} onClick={() => setze(p)} aria-label={`${p.name}: ${STATUS_WORT[st]}. Tippen für ${STATUS_WORT[NEXT[st]]}.`}>
                  <span className="kp-mark" aria-hidden="true">{MARK[st]}</span>
                  <span className="kp-text">
                    <span>{p.name}</span>
                    <span className="meta">{[p.gruppe, p.de, st !== "offen" ? STATUS_WORT[st] : ""].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </>
      )}
      {art !== "naechstes" && (
        <Link href="/training/karate" className="settings-link">Ganzes Prüfungsprogramm ›</Link>
      )}
    </section>
  );
}
