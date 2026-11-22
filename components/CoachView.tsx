"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coachContext";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { getCoachPrefs, useCoachPrefs } from "@/lib/prefs";

type Msg = { role: "user" | "assistant"; content: string };

// Kleines Coach-Zeichen vor jeder Antwort (Markenfarbe Beere, wie der Coach-Knopf)
function CoachMark() {
  return (
    <span className="coach-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M4 5h16v11H9l-5 4zM7 10.5h2.5l1.5-2.5 2 5 1.5-2.5H17" />
      </svg>
    </span>
  );
}

const SUGGESTIONS = [
  "Was passt heute für mein Training?",
  "Welche Muster siehst du bei mir?",
  "Worauf muss ich mit Bufori beim Training achten?",
  "Wie bereite ich mich diese Woche auf den 5. Kyu vor?",
];

// Coach-Chat: die Frage und eine kompakte Zusammenfassung gehen an die Funktion "coach"
export default function CoachView() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const context = useRef<Promise<string> | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const prefs = useCoachPrefs();

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.from("coach_messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data, error: e }) => {
        if (e) setError("Verlauf konnte nicht geladen werden: " + e.message);
        setMsgs(((data ?? []) as Msg[]).reverse());
      });
    // Zusammenfassung schon vorbereiten, damit die erste Antwort schneller kommt
    context.current = buildCoachContext().catch(() => "");
    // Coach-Einstieg aus einer Karte: Frage vorbelegen, gesendet wird erst nach deinem Tippen
    const frage = new URLSearchParams(window.location.search).get("frage");
    if (frage) {
      setText(frage.slice(0, 2000));
      setPrefilled(true);
      window.history.replaceState(null, "", "/coach");
    }
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const send = async (q: string) => {
    const sb = supabase();
    const question = q.trim();
    if (!sb || !question || busy) return;
    setText("");
    setPrefilled(false);
    setError("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    const ctx = await (context.current ?? Promise.resolve(""));
    const { data, error: e } = await sb.functions.invoke("coach", { body: { message: question, context: ctx, limit: getCoachPrefs().dailyLimit } });
    setBusy(false);
    let detail = data?.error as string | undefined;
    if (e) {
      detail = e.message;
      try {
        const res = (e as { context?: Response }).context;
        if (res && typeof res.json === "function") detail = (await res.json())?.error ?? detail;
      } catch {
        // Standardtext behalten
      }
    }
    if (detail || !data?.answer) {
      setError("Der Coach konnte nicht antworten: " + (detail ?? "keine Antwort"));
      return;
    }
    setMsgs((m) => [...m, { role: "assistant", content: data.answer as string }]);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    send(text);
  };

  if (!prefs.on) {
    return (
      <>
        <PageHead title="Coach" sub="Ausgeschaltet" />
        <section className="card">
          <h2>Der Coach ist aus</h2>
          <p>Solange er aus ist, gehen keine Fragen an Claude und es entstehen keine Kosten.</p>
          <Link href="/einstellungen" className="btn btn-dark">In den Einstellungen einschalten</Link>
        </section>
        <Link href="/coach/hinweise" className="settings-link">Frühere Hinweise des Coachs ansehen ›</Link>
      </>
    );
  }

  return (
    <>
      <PageHead title="Coach" sub="Kennt Training, Erholung, Zyklus, Symptome und Medikamente" />
      <Link href="/coach/hinweise" className="settings-link">Alle Hinweise des Coachs ansehen ›</Link>
      <div className="chat">
        {!msgs.length && (
          <div className="bubble bubble-assistant">
            <CoachMark />
            Hallo! Frag mich zu deinem Training, deiner Erholung oder deinen Symptomen. Ich kenne deine Werte der letzten Wochen, deinen Plan und deine Medikamente. Diagnosen und Dosierungen gebe ich nicht.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "bubble bubble-user" : "bubble bubble-assistant"}>
            {m.role === "assistant" && <CoachMark />}
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="bubble bubble-assistant bubble-wait">
            <CoachMark />
            Denkt nach …
          </div>
        )}
        <div ref={end} />
      </div>
      {error && <p className="alert">{error}</p>}
      <div className="pills scroll">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="pill pill-sm" disabled={busy} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      {prefilled && text && <span className="meta">Frage vorbereitet. Sie geht erst an den Coach, wenn du auf Senden tippst.</span>}
      <form className="chat-input" onSubmit={submit}>
        <textarea className="input" rows={prefilled ? 3 : 1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Frag deinen Coach" aria-label="Frage an den Coach" maxLength={2000} />
        <button type="submit" className="btn btn-primary chat-send" disabled={busy || !text.trim()}>
          Senden
        </button>
      </form>
      <span className="hint">Antworten kommen von Claude. Pro Frage geht nur eine kurze Zusammenfassung deiner Daten mit.</span>
    </>
  );
}
