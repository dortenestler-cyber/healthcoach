"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { checkPin, clearPin, fails, hasPin, isUnlocked, lock, markUnlocked, MAX_FAILS, setPin, LOCK_AFTER_MS } from "@/lib/pin";

type Mode = "laden" | "festlegen" | "bestaetigen" | "eingeben" | "offen";

// Sperrt die App mit einer 4-stelligen PIN.
// Beim ersten Start wird die PIN festgelegt, danach beim Öffnen und nach 5 Minuten im Hintergrund abgefragt.
export default function PinLock({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("laden");
  const [digits, setDigits] = useState("");
  const [first, setFirst] = useState("");
  const [msg, setMsg] = useState("");
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    setMode(!hasPin() ? "festlegen" : isUnlocked() ? "offen" : "eingeben");

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS && hasPin()) {
        lock();
        setDigits("");
        setMsg("");
        setMode("eingeben");
      } else if (hasPin() && isUnlocked()) {
        markUnlocked();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Solange die App offen ist, gilt sie als entsperrt
  useEffect(() => {
    if (mode !== "offen") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") markUnlocked();
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  const signOut = async () => {
    clearPin();
    await supabase()?.auth.signOut();
  };

  const complete = async (pin: string) => {
    if (mode === "festlegen") {
      setFirst(pin);
      setDigits("");
      setMsg("");
      setMode("bestaetigen");
    } else if (mode === "bestaetigen") {
      if (pin === first) {
        await setPin(pin);
        setMode("offen");
      } else {
        setDigits("");
        setFirst("");
        setMsg("Die PINs stimmen nicht überein. Bitte noch einmal.");
        setMode("festlegen");
      }
    } else if (mode === "eingeben") {
      if (await checkPin(pin)) {
        setDigits("");
        setMsg("");
        setMode("offen");
      } else if (fails() >= MAX_FAILS) {
        await signOut();
      } else {
        setDigits("");
        const left = MAX_FAILS - fails();
        setMsg(`Falsche PIN. Noch ${left} ${left === 1 ? "Versuch" : "Versuche"}, danach brauchst du dein Passwort.`);
      }
    }
  };

  const press = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) window.setTimeout(() => complete(next), 120);
  };

  if (mode === "laden") return <p className="hint">Lädt …</p>;
  if (mode === "offen") return <>{children}</>;

  const title = mode === "festlegen" ? "PIN festlegen" : mode === "bestaetigen" ? "PIN wiederholen" : "PIN eingeben";
  const sub =
    mode === "festlegen"
      ? "Damit entsperrst du Health Coach ab jetzt, ohne Passwort."
      : mode === "bestaetigen"
        ? "Zur Sicherheit noch einmal."
        : "Health Coach ist gesperrt.";

  return (
    <div className="pin">
      <img src="/icons/icon.svg" alt="" width={56} height={56} className="login-icon" />
      <h1 className="pin-title">{title}</h1>
      <span className="page-sub">{sub}</span>
      <div className="pin-dots" aria-label={`${digits.length} von 4 Ziffern eingegeben`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="pin-dot" data-on={i < digits.length} />
        ))}
      </div>
      <p className="login-msg pin-msg" role="status">{msg}</p>
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className="pin-key" onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button type="button" className="pin-key" onClick={() => press("0")}>0</button>
        <button type="button" className="pin-key pin-key-ghost" aria-label="Löschen" onClick={() => setDigits(digits.slice(0, -1))}>⌫</button>
      </div>
      {mode === "eingeben" && (
        <button type="button" className="btn btn-link" onClick={signOut}>PIN vergessen? Mit Passwort anmelden</button>
      )}
    </div>
  );
}
