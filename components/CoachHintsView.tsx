"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHead from "@/components/PageHead";

type Msg = { role: "user" | "assistant"; content: string; created_at: string };
type Hint = { at: string; question: string; answer: string };

const SEEN_KEY = "hc_hints_seen";
const PAGE = 100;

// Alle Antworten des Coachs als Liste, neueste zuerst, auch bereits gesehene.
// „Neu“ heißt: seit dem letzten Besuch dieser Seite.
export default function CoachHintsView() {
  const [hints, setHints] = useState<Hint[]>([]);
  const [more, setMore] = useState(false);
  const [seen, setSeen] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async (before?: string) => {
    const sb = supabase();
    if (!sb) return;
    let q = sb.from("coach_messages").select("role, content, created_at").order("created_at", { ascending: false }).limit(PAGE);
    if (before) q = q.lt("created_at", before);
    const { data, error: e } = await q;
    if (e) {
      setError("Hinweise konnten nicht geladen werden: " + e.message);
      return;
    }
    const rows = (data ?? []) as Msg[];
    const list: Hint[] = [];
    // Neueste zuerst: jede Antwort bekommt die Frage direkt davor
    rows.forEach((m, i) => {
      if (m.role !== "assistant") return;
      const prev = rows[i + 1];
      list.push({ at: m.created_at, answer: m.content, question: prev?.role === "user" ? prev.content : "" });
    });
    setHints((h) => (before ? [...h, ...list] : list));
    setMore(rows.length === PAGE);
  };

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY) ?? "");
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      // nichts zu tun
    }
    load();
  }, []);

  const q = query.trim().toLowerCase();
  const shown = q ? hints.filter((h) => (h.question + " " + h.answer).toLowerCase().includes(q)) : hints;
  const fresh = hints.filter((h) => seen && h.at > seen).length;

  return (
    <>
      <PageHead title="Hinweise" sub={fresh ? `${fresh} neu seit deinem letzten Besuch` : undefined} />
      {error && <p className="alert">{error}</p>}
      <input className="input" type="search" placeholder="Suchen, z. B. Kettlebell" aria-label="Hinweise durchsuchen" value={query} onChange={(e) => setQuery(e.target.value)} />
      {!hints.length && !error && (
        <section className="card">
          <h2>Noch keine Hinweise</h2>
          <p>Sobald du dem Coach eine Frage stellst, steht seine Antwort hier.</p>
          <Link href="/coach" className="btn btn-dark">Coach öffnen</Link>
        </section>
      )}
      {shown.map((h) => (
        <section key={h.at} className="card">
          <div className="card-row">
            <span className="meta">{new Date(h.at).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            {seen && h.at > seen && <span className="pill pill-sm">Neu</span>}
          </div>
          {h.question && <p className="row-strong">{h.question}</p>}
          <p className="hint-text">{h.answer}</p>
        </section>
      ))}
      {more && !q && (
        <button type="button" className="btn btn-soft" onClick={() => load(hints[hints.length - 1]?.at)}>
          Ältere laden
        </button>
      )}
    </>
  );
}
