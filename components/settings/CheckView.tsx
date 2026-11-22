"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHead from "@/components/PageHead";
import { Group } from "@/components/SettingsView";

type State = "ok" | "warn" | "wait";
type Item = { label: string; state: State; status: string; note: string };

const WARN_DAYS = 14; // so lange vor Ablauf des Garmin-Schlüssels warnen

async function invoke(name: string, body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const sb = supabase();
  if (!sb) return { data: null, error: "Supabase ist nicht verbunden." };
  const { data, error } = await sb.functions.invoke(name, { body });
  if (!error) return { data, error: null };
  let detail = error.message;
  try {
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === "function") detail = (await res.json())?.error ?? detail;
  } catch {
    // Standardtext behalten
  }
  return { data: null, error: detail };
}

function ago(ms: number): string {
  const h = Math.round(ms / 36e5);
  if (h < 1) return "vor weniger als einer Stunde";
  if (h < 48) return `vor ${h} ${h === 1 ? "Stunde" : "Stunden"}`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

// Prüft, ob alles eingerichtet ist: Garmin-Funktion und Schlüssel, letzter Abruf, Coach.
export default function CheckView() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setBusy(true);
    const out: Item[] = [];
    const sb = supabase();

    // 1. Garmin-Funktion und Schlüssel
    const g = await invoke("garmin-sync", { check: true });
    if (g.error) {
      out.push({ label: "Funktion garmin-sync", state: "warn", status: "Fehler", note: g.error.includes("Failed to send") ? "Die Funktion ist nicht erreichbar. Ist sie in Supabase bereitgestellt?" : g.error });
    } else {
      out.push({ label: "Funktion garmin-sync", state: "ok", status: "Läuft", note: "Die Funktion antwortet." });
      out.push(
        g.data?.ok
          ? { label: "GARMIN_API_KEY", state: "ok", status: "Gültig", note: "Garmin nimmt den Schlüssel an." }
          : { label: "GARMIN_API_KEY", state: "warn", status: "Ungültig", note: String(g.data?.error ?? "Garmin lehnt den Schlüssel ab.") + " Neuen Schlüssel in Garmin Connect erzeugen und in den Supabase-Secrets ersetzen." }
      );
      const exp = typeof g.data?.expires === "string" ? new Date(g.data.expires + "T00:00:00") : null;
      if (exp && !isNaN(exp.getTime())) {
        const days = Math.ceil((exp.getTime() - Date.now()) / 864e5);
        out.push({
          label: "Ablauf des Schlüssels",
          state: days <= WARN_DAYS ? "warn" : "ok",
          status: days < 0 ? "Abgelaufen" : `in ${days} Tagen`,
          note: `Läuft ab am ${exp.toLocaleDateString("de-DE")}.${days <= WARN_DAYS ? " Bitte rechtzeitig erneuern und GARMIN_API_KEY_EXPIRES anpassen." : ""}`,
        });
      } else {
        out.push({ label: "Ablauf des Schlüssels", state: "wait", status: "Unbekannt", note: "Für eine Warnung vor Ablauf das Datum als Secret GARMIN_API_KEY_EXPIRES (JJJJ-MM-TT) in Supabase eintragen." });
      }
    }

    // 2. Letzter Abruf
    const last = await sb?.from("garmin_daily").select("synced_at").order("synced_at", { ascending: false }).limit(1).maybeSingle();
    const at = last?.data?.synced_at ? new Date(last.data.synced_at as string) : null;
    if (!at) out.push({ label: "Letzter Abruf", state: "warn", status: "Noch nie", note: "Auf Heute bei den Garmin-Karten „Aktualisieren“ tippen." });
    else {
      const ms = Date.now() - at.getTime();
      out.push({ label: "Letzter Abruf", state: ms > 2 * 864e5 ? "warn" : "ok", status: ago(ms), note: at.toLocaleString("de-DE") });
    }

    // 3. Coach
    const c = await invoke("coach", { check: true });
    out.push(
      c.error
        ? { label: "Coach", state: "warn", status: "Fehler", note: c.error }
        : { label: "Coach", state: "ok", status: "Bereit", note: `Schlüssel vorhanden, Modell ${String(c.data?.model ?? "")}.` }
    );

    setItems(out);
    setBusy(false);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <>
      <PageHead title="Einrichtungs-Check" sub="Einstellungen" />
      <Group title="Status">
        {!items.length && <p className="settings-note">Prüft …</p>}
        {items.map((i) => (
          <div key={i.label} className="settings-row">
            <span className="stack">
              <span className="row-label">{i.label}</span>
              <span className="meta">{i.note}</span>
            </span>
            <span className="check-status" data-state={i.state}>
              {i.status}
            </span>
          </div>
        ))}
      </Group>
      <button type="button" className="btn btn-soft" disabled={busy} onClick={check}>
        {busy ? "Prüft …" : "Erneut prüfen"}
      </button>
    </>
  );
}
