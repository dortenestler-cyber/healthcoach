"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coachContext";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { getCoachPrefs, useCoachPrefs } from "@/lib/prefs";
import { daysAgo, isoDay } from "@/lib/dates";

type Msg = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updated_at: string };

// Nach 6 Stunden ohne Nachricht beginnt beim Öffnen ein neuer Chat
const NEW_CHAT_AFTER = 6 * 3600 * 1000;

function chatGroup(iso: string): string {
  const d = isoDay(new Date(iso));
  if (d === isoDay()) return "Heute";
  if (d === isoDay(daysAgo(1))) return "Gestern";
  if (d >= isoDay(daysAgo(6))) return "Diese Woche";
  return "Älter";
}

function chatWhen(iso: string): string {
  const d = new Date(iso);
  if (isoDay(d) === isoDay()) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
}

// Leichtes Markdown der Antworten: **fett** und Listen mit „- “, sonst reiner Text
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Answer({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const item = /^\s*[-*•]\s+/.test(line);
    if (!line.trim()) { blocks.push({ list: false, lines: [] }); continue; }
    const last = blocks[blocks.length - 1];
    const content = item ? line.replace(/^\s*[-*•]\s+/, "") : line.replace(/^#+\s*/, "");
    if (last && last.list === item && last.lines.length) last.lines.push(content);
    else blocks.push({ list: item, lines: [content] });
  }
  return (
    <div className="answer">
      {blocks.filter((b) => b.lines.length).map((b, i) =>
        b.list ? (
          <ul key={i}>{b.lines.map((l, j) => <li key={j}><Inline text={l} /></li>)}</ul>
        ) : (
          <p key={i}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}<Inline text={l} /></span>)}</p>
        ),
      )}
    </div>
  );
}

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

// Coach-Chat: die Frage und eine kompakte Zusammenfassung gehen an die Funktion "coach".
// panel: als Spalte rechts am Computer (Konzept Web-App), mit eigenem Kopf und Einklappen-Knopf.
export default function CoachView({ panel, onClose }: { panel?: boolean; onClose?: () => void } = {}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  // chats: null = Tabelle coach_chats fehlt noch (alter Verlauf ohne Chats)
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const context = useRef<Promise<string> | null>(null);
  const contextAt = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const prefs = useCoachPrefs();

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    loadChats().then((list) => {
      if (list === null) {
        // Ohne Chats: die letzten Nachrichten wie bisher
        sb.from("coach_messages")
          .select("role, content")
          .order("created_at", { ascending: false })
          .limit(40)
          .then(({ data, error: e }) => {
            if (e) setError("Verlauf konnte nicht geladen werden: " + e.message);
            setMsgs(((data ?? []) as Msg[]).reverse());
          });
        return;
      }
      const last = list[0];
      if (last && Date.now() - new Date(last.updated_at).getTime() < NEW_CHAT_AFTER) openChat(last.id);
    });
    // Zusammenfassung schon vorbereiten, damit die erste Antwort schneller kommt
    context.current = buildCoachContext().catch(() => "");
    contextAt.current = Date.now();
    // Coach-Einstieg aus einer Karte: Frage vorbelegen, gesendet wird erst nach deinem Tippen
    const frage = panel ? null : new URLSearchParams(window.location.search).get("frage");
    if (frage) {
      setText(frage.slice(0, 2000));
      setPrefilled(true);
      window.history.replaceState(null, "", "/coach");
    }
  }, []);

  async function loadChats(): Promise<Chat[] | null> {
    const sb = supabase();
    if (!sb) return null;
    const { data, error: e } = await sb.from("coach_chats").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(200);
    const list = e ? null : ((data ?? []) as Chat[]);
    setChats(list);
    return list;
  }

  async function openChat(id: string) {
    const sb = supabase();
    if (!sb) return;
    setChatId(id);
    setListOpen(false);
    setError("");
    const { data, error: e } = await sb.from("coach_messages").select("role, content").eq("chat_id", id).order("created_at", { ascending: true }).limit(400);
    if (e) setError("Chat konnte nicht geladen werden: " + e.message);
    setMsgs((data ?? []) as Msg[]);
  }

  function newChat() {
    setChatId(null);
    setMsgs([]);
    setError("");
    setListOpen(false);
    field.current?.focus();
  }

  async function deleteChat(c: Chat) {
    const sb = supabase();
    if (!sb || !window.confirm(`Chat „${c.title}“ löschen? Das lässt sich nicht rückgängig machen.`)) return;
    const { error: e } = await sb.from("coach_chats").delete().eq("id", c.id);
    if (e) {
      setError("Chat konnte nicht gelöscht werden: " + e.message);
      return;
    }
    setChats((l) => (l ?? []).filter((x) => x.id !== c.id));
    if (c.id === chatId) {
      setChatId(null);
      setMsgs([]);
    }
  }

  // Eingabefeld wächst mit dem Text (bis zur Obergrenze in globals.css)
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }, [text]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  // Am Computer: „/“ springt ins Eingabefeld
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        field.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const send = async (q: string) => {
    const sb = supabase();
    const question = q.trim();
    if (!sb || !question || busy) return;
    setText("");
    setPrefilled(false);
    setError("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    // Zusammenfassung älter als 2 Minuten (Coach-Spalte bleibt lange offen, Garmin synchronisiert): neu bauen
    if (!context.current || Date.now() - contextAt.current > 120_000) {
      context.current = buildCoachContext().catch(() => "");
      contextAt.current = Date.now();
    }
    const ctx = await context.current;
    const { data, error: e } = await sb.functions.invoke("coach", { body: { message: question, context: ctx, limit: getCoachPrefs().dailyLimit, chat_id: chatId } });
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
    if (typeof data.chat_id === "string") {
      setChatId(data.chat_id);
      loadChats();
    }
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    send(text);
  };

  if (!prefs.on && panel) return null;
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

  const head = panel ? (
    <div className="coach-panel-head">
      <span className="coach-panel-title"><CoachMark /> Coach</span>
      <Link href="/coach/hinweise" className="link-small">Hinweise</Link>
      {onClose && (
        <button type="button" className="btn btn-soft btn-44" onClick={onClose} aria-label="Coach einklappen">
          Einklappen ›
        </button>
      )}
    </div>
  ) : (
    <>
      <PageHead title="Coach" />
      <Link href="/coach/hinweise" className="settings-link">Alle Hinweise des Coachs ansehen ›</Link>
    </>
  );

  const current = chats?.find((c) => c.id === chatId);
  const bar = chats !== null && (
    <div className="coach-bar">
      <span className="coach-bar-title">{listOpen ? "Verlauf" : current ? current.title : "Neuer Chat"}</span>
      <button type="button" className="btn btn-soft" aria-pressed={listOpen} onClick={() => setListOpen((o) => !o)}>
        {listOpen ? "Zurück" : "Verlauf"}
      </button>
      <button type="button" className="btn btn-soft" onClick={newChat} disabled={busy || (!chatId && !msgs.length && !listOpen)}>
        Neuer Chat
      </button>
    </div>
  );

  if (listOpen && chats) {
    const groups: [string, Chat[]][] = [];
    for (const c of chats) {
      const g = chatGroup(c.updated_at);
      const last = groups[groups.length - 1];
      if (last && last[0] === g) last[1].push(c);
      else groups.push([g, [c]]);
    }
    return (
      <>
        {head}
        {bar}
        <div className="coach-list">
          {!chats.length && <p className="meta">Noch keine Chats. Deine Fragen erscheinen hier, sobald der Coach geantwortet hat.</p>}
          {groups.map(([g, list]) => (
            <section key={g} className="coach-list-group" aria-label={g}>
              <h3 className="coach-list-head">{g}</h3>
              {list.map((c) => (
                <div key={c.id} className={c.id === chatId ? "coach-list-row is-current" : "coach-list-row"}>
                  <button type="button" className="coach-list-open" onClick={() => openChat(c.id)}>
                    <span className="coach-list-title">{c.title}</span>
                    <span className="coach-list-when">{c.id === chatId ? "Offen · " : ""}{chatWhen(c.updated_at)}</span>
                  </button>
                  <button type="button" className="coach-list-del" onClick={() => deleteChat(c)} aria-label={`Chat „${c.title}“ löschen`}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </div>
              ))}
            </section>
          ))}
        </div>
        {error && <p className="alert">{error}</p>}
      </>
    );
  }

  return (
    <>
      {head}
      {bar}
      <div className="chat">
        {!msgs.length && (
          <div className="bubble bubble-assistant">
            <CoachMark />
            Hallo! Frag mich zu deinem Training, deiner Erholung oder deinen Symptomen. Ich kenne deine Werte der letzten Wochen, deinen Plan und deine Medikamente. Diagnosen und Dosierungen gebe ich nicht.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "bubble bubble-user" : "bubble bubble-assistant"}>
            {m.role === "assistant" ? (<><CoachMark /><Answer text={m.content} /></>) : m.content}
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
      <form className="chat-input" onSubmit={submit}>
        <textarea ref={field} className="input" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Frag deinen Coach" aria-label="Frage an den Coach" maxLength={2000} />
        <button type="submit" className="chat-send" disabled={busy || !text.trim()} aria-label="Senden">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
          </svg>
        </button>
      </form>
      <span className="hint">Antworten kommen von Claude. Pro Frage geht nur eine kurze Zusammenfassung deiner Daten mit.</span>
    </>
  );
}
