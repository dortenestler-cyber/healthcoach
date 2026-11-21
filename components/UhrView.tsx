"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shortDate } from "@/lib/dates";
import PageHead from "@/components/PageHead";

type Token = { id: string; label: string; created_at: string; last_used_at: string | null };

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return "hcw_" + b64;
}

// Uhr verbinden: eigener Schlüssel für die Fenix, nur der Hash wird gespeichert
export default function UhrView() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.from("watch_tokens").select("id, label, created_at, last_used_at").order("created_at", { ascending: false });
    if (e) setError("Uhr-Schlüssel konnten nicht geladen werden: " + e.message);
    setTokens((data ?? []) as Token[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const sb = supabase();
    if (!sb) return;
    const t = newToken();
    const { error: e } = await sb.from("watch_tokens").insert({ token_hash: await sha256(t), label: "Fenix 9 Pro" });
    if (e) return setError("Schlüssel konnte nicht angelegt werden: " + e.message);
    setFresh(t);
    setCopied(false);
    setError("");
    load();
  };

  const remove = async (id: string) => {
    await supabase()?.from("watch_tokens").delete().eq("id", id);
    load();
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Link href="/" className="back-link">‹ Heute</Link>
      <PageHead title="Uhr verbinden" sub="Health Coach auf der Fenix 9 Pro" />
      {error && <p className="alert">{error}</p>}

      {fresh && (
        <section className="card">
          <h2>Dein neuer Uhr-Schlüssel</h2>
          <p>Er wird nur jetzt angezeigt. Kopiere ihn und füge ihn in den Einstellungen der Uhr-App ein.</p>
          <code className="token">{fresh}</code>
          <button type="button" className="btn btn-dark" onClick={copy}>{copied ? "Kopiert" : "Kopieren"}</button>
          <ol className="steps">
            <li>Garmin Connect IQ App auf dem Handy öffnen</li>
            <li>Meine Geräte → Fenix → Health Coach → Einstellungen</li>
            <li>Bei „Uhr-Schlüssel“ einfügen und speichern</li>
          </ol>
        </section>
      )}

      <section className="card">
        <h2>Verbundene Uhren</h2>
        {!tokens.length && <p>Noch keine Uhr verbunden.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="card-row list-line">
            <div className="stack">
              <span className="row-strong">{t.label}</span>
              <span className="meta">
                angelegt {shortDate(new Date(t.created_at))} · {t.last_used_at ? "zuletzt aktiv " + shortDate(new Date(t.last_used_at)) : "noch nicht benutzt"}
              </span>
            </div>
            <button type="button" className="btn btn-link" onClick={() => remove(t.id)}>Trennen</button>
          </div>
        ))}
        <button type="button" className="btn btn-dashed" onClick={create}>+ Neuen Uhr-Schlüssel erzeugen</button>
        <span className="meta">Der Schlüssel erlaubt der Uhr nur das Nötige: Einträge machen und die Übersicht für heute laden. „Trennen“ sperrt ihn sofort.</span>
      </section>
    </>
  );
}
