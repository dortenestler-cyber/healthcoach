"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import TabBar from "@/components/TabBar";
import CoachButton from "@/components/CoachButton";
import PinLock from "@/components/PinLock";
import { markUnlocked } from "@/lib/pin";

type State = "laden" | "aus" | "login" | "drin";

// Zeigt die App nur mit Anmeldung. Anmeldung mit E-Mail und Passwort,
// damit es auch in der App auf dem Startbildschirm funktioniert.
export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("laden");

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setState("aus");
      return;
    }
    sb.auth.getSession().then(({ data }) => setState(data.session ? "drin" : "login"));
    const { data: sub } = sb.auth.onAuthStateChange((event, session: Session | null) => {
      // Wer sich gerade mit Passwort angemeldet hat, muss nicht sofort noch die PIN eingeben
      if (event === "SIGNED_IN" && session) markUnlocked();
      setState(session ? "drin" : "login");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "laden") return <p className="hint">Lädt …</p>;
  if (state === "aus") {
    return (
      <section className="card">
        <h2>Noch nicht verbunden</h2>
        <p>
          Es fehlen die Werte für Supabase. Trag <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> bei Vercel oder in <code>.env.local</code> ein.
        </p>
      </section>
    );
  }
  if (state === "login") return <Login />;
  return (
    <PinLock>
      {children}
      <CoachButton />
      <TabBar />
    </PinLock>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "neu">("login");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setBusy(true);
    setMsg("");
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMsg(
          error.message.toLowerCase().includes("confirm")
            ? "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der E-Mail von Supabase."
            : "E-Mail oder Passwort stimmt nicht."
        );
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg("Das hat nicht geklappt: " + error.message);
      else if (!data.session) {
        setMsg("Fast geschafft: Bestätige deine E-Mail-Adresse über den Link in der E-Mail. Danach meldest du dich hier an.");
        setMode("login");
      }
    }
    setBusy(false);
  };

  return (
    <div className="login">
      <img src="/icons/icon.svg" alt="" width={72} height={72} className="login-icon" />
      <h1 className="page-title">Health Coach</h1>
      <span className="page-sub">Training, Erholung und Perimenopause</span>
      <form className="card login-card" onSubmit={submit}>
        <label htmlFor="email" className="label">E-Mail-Adresse</label>
        <input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password" className="label">Passwort</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Einen Moment …" : mode === "login" ? "Anmelden" : "Konto anlegen"}
        </button>
        <button className="btn btn-link" type="button" onClick={() => { setMode(mode === "login" ? "neu" : "login"); setMsg(""); }}>
          {mode === "login" ? "Noch kein Konto? Konto anlegen" : "Ich habe schon ein Konto"}
        </button>
      </form>
      {msg && <p className="login-msg" role="status">{msg}</p>}
    </div>
  );
}
