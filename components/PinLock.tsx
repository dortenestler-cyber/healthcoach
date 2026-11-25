"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { checkFaceId, faceIdOn } from "@/lib/faceid";
import { checkPin, clearPin, fails, hasPin, isUnlocked, lock, markUnlocked, MAX_FAILS, pinRequired, setPin, LOCK_AFTER_MS } from "@/lib/pin";
import { greeting } from "@/lib/dates";

type Mode = "laden" | "festlegen" | "bestaetigen" | "eingeben" | "offen";

// Sperrt die App mit einer 4-stelligen PIN.
// Beim ersten Start wird die PIN festgelegt, danach beim Öffnen und nach 5 Minuten im Hintergrund abgefragt.
// Nur auf dem iPhone in der App vom Home-Bildschirm (pinRequired). Im Browser und auf dem iPad keine PIN.
export default function PinLock({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("laden");
  const [digits, setDigits] = useState("");
  const [first, setFirst] = useState("");
  const [msg, setMsg] = useState("");
  const hiddenAt = useRef<number | null>(null);
  const [face, setFace] = useState(false);

  const tryFace = async () => {
    if (!faceIdOn()) return;
    if (await checkFaceId()) {
      markUnlocked();
      setDigits("");
      setMsg("");
      setMode("offen");
    } else {
      setMsg("Face ID hat nicht geklappt. Bitte die PIN eingeben.");
    }
  };

  // Beim Sperren Face ID gleich anbieten (PIN bleibt darunter als Rückfall)
  useEffect(() => {
    if (mode !== "eingeben") return;
    const on = faceIdOn();
    setFace(on);
    if (on) tryFace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!pinRequired()) {
      setMode("offen");
      return;
    }
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

  const hello = greeting();
  const letters = ["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"];

  // Sperrbildschirm (Konzept dunkel 2): App-Symbol, Gruß, PIN-Punkte, Ziffernfeld wie beim iPhone.
  // Hier steht nie ein Gesundheitswert.
  return (
    <div className="pin">
      <div className="pin-glow" aria-hidden="true" />
      <img src="/icons/mark.svg" alt="" width={104} height={104} className="pin-icon" />
      <span className="eyebrow pin-brand">Health Coach</span>
      <h1 className="pin-title">{mode === "eingeben" ? hello : title}</h1>
      <span className="pin-sub">{mode === "eingeben" ? "PIN eingeben" : sub}</span>
      <div className="pin-dots" role="img" aria-label={`${digits.length} von 4 Ziffern eingegeben`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="pin-dot" data-on={i < digits.length} />
        ))}
      </div>
      <p className="login-msg pin-msg" role="status">{msg}</p>
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d, i) => (
          <button key={d} type="button" className="pin-key" aria-label={d} onClick={() => press(d)}>
            <span className="pin-num">{d}</span>
            <span className="pin-letters" aria-hidden="true">{letters[i]}</span>
          </button>
        ))}
        {mode === "eingeben" && face ? (
          <button type="button" className="pin-key pin-key-ghost" aria-label="Mit Face ID entsperren" onClick={tryFace}>
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9.5v1M15 9.5v1M12 9.5V13h-1M9.5 15.5a3.5 3.5 0 0 0 5 0" />
            </svg>
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="pin-key" aria-label="0" onClick={() => press("0")}>
          <span className="pin-num">0</span>
        </button>
        <button type="button" className="pin-key pin-key-ghost" aria-label="Letzte Ziffer löschen" onClick={() => setDigits(digits.slice(0, -1))}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5H9l-6 7 6 7h12zM17 9.5l-5 5M12 9.5l5 5" />
          </svg>
        </button>
      </div>
      {mode === "eingeben" && (
        <button type="button" className="btn btn-link" onClick={signOut}>PIN vergessen? Mit Passwort anmelden</button>
      )}
    </div>
  );
}
