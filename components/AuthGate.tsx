"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import TabBar from "@/components/TabBar";
import CoachButton from "@/components/CoachButton";

type State = "laden" | "aus" | "login" | "drin";

// Zeigt die App nur mit Anmeldung. Anmeldung mit einem Code per E-Mail,
// damit es auch in der App auf dem Startbildschirm funktioniert (ein Link würde sich in Safari öffnen).
export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("laden");

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setState("aus");
      return;
    }
    sb.auth.getSession().then(({ data }) => setState(data.session ? "drin" : "login"));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session: Session | null) => {
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
    <>
      {children}
      <CoachButton />
      <TabBar />
    </>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb || !email.trim()) return;
    setBusy(true);
    setMsg("");
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg("Das hat nicht geklappt: " + error.message);
    else {
      setStep("code");
      setMsg("Wir haben dir einen Code per E-Mail geschickt.");
    }
  };

  const checkCode = async (e: FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setBusy(true);
    setMsg("");
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setMsg("Der Code passt nicht oder ist abgelaufen. Fordere einen neuen an.");
  };

  return (
    <div className="login">
      <img src="/icons/icon.svg" alt="" width={72} height={72} className="login-icon" />
      <h1 className="page-title">Health Coach</h1>
      <span className="page-sub">Training, Erholung und Perimenopause</span>
      {step === "email" ? (
        <form className="card login-card" onSubmit={sendCode}>
          <label htmlFor="email" className="label">E-Mail-Adresse</label>
          <input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sende …" : "Code senden"}</button>
        </form>
      ) : (
        <form className="card login-card" onSubmit={checkCode}>
          <label htmlFor="code" className="label">Code aus der E-Mail</label>
          <input id="code" className="input input-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Prüfe …" : "Anmelden"}</button>
          <button className="btn btn-link" type="button" onClick={() => { setStep("email"); setCode(""); setMsg(""); }}>Andere E-Mail oder neuer Code</button>
        </form>
      )}
      {msg && <p className="login-msg" role="status">{msg}</p>}
    </div>
  );
}
