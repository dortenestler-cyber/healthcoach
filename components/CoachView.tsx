"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coachContext";
import PageHead from "@/components/PageHead";

type Msg = { role: "user" | "assistant"; content: string };

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
  const context = useRef<Promise<string> | null>(null);
  const end = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const send = async (q: string) => {
    const sb = supabase();
    const question = q.trim();
    if (!sb || !question || busy) return;
    setText("");
    setError("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    const ctx = await (context.current ?? Promise.resolve(""));
    const { data, error: e } = await sb.functions.invoke("coach", { body: { message: question, context: ctx } });
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

  return (
    <>
      <PageHead title="Coach" sub="Kennt Training, Erholung, Zyklus, Symptome und Medikamente" />
      <div className="chat">
        {!msgs.length && (
          <div className="bubble bubble-assistant">
            Hallo! Frag mich zu deinem Training, deiner Erholung oder deinen Symptomen. Ich kenne deine Werte der letzten Wochen, deinen Plan und deine Medikamente. Diagnosen und Dosierungen gebe ich nicht.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "bubble bubble-user" : "bubble bubble-assistant"}>
            {m.content}
          </div>
        ))}
        {busy && <div className="bubble bubble-assistant bubble-wait">Denkt nach …</div>}
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
      <form className="chat-input" onSubmit={submit}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Frag deinen Coach" aria-label="Frage an den Coach" maxLength={2000} />
        <button type="submit" className="btn btn-primary chat-send" disabled={busy || !text.trim()}>
          Senden
        </button>
      </form>
      <span className="hint">Antworten kommen von Claude. Pro Frage geht nur eine kurze Zusammenfassung deiner Daten mit.</span>
    </>
  );
}
