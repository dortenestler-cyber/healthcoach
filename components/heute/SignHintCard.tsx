"use client";

// Anzeichen auf Heute (Sammelliste Punkt 19): ruhiger Hinweis, wenn Anzeichen auf auffällige Werte treffen,
// und die Frage „Bist du krank?“, wenn die Anzeichen zwei Tage in Folge stärker werden. Keine Diagnose.

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { shortDate } from "@/lib/dates";
import { ILLNESSES } from "@/lib/health";
import { signHint, sickQuestion } from "@/lib/anzeichen";
import type { Data } from "@/lib/insights";

export default function SignHintCard({ data, today, onSaved }: { data: Data; today: string; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hint = signHint(data, today);
  if (!hint) return null;
  const ask = sickQuestion(data, today);
  const ill = ask ? ILLNESSES.find((i) => i.key === ask.suggest) : null;

  const enter = async () => {
    const sb = supabase();
    if (!sb || !ask || !ill) return;
    setBusy(true);
    const { error: e } = await sb.from("illnesses").insert({ kind: ill.key, label: ill.label, started_on: ask.since, fever: !!ill.fever, below_neck: !!ill.below, severity: 2 });
    setBusy(false);
    if (e) setError("Das hat nicht geklappt: " + e.message);
    else onSaved();
  };

  return (
    <section className="card sign-hint" aria-label="Anzeichen">
      <span className="eyebrow sign-hint-eyebrow">Anzeichen</span>
      <p className="sign-hint-text">{hint.text}</p>
      {ask && ill && (
        <div className="sign-hint-ask">
          <span className="row-strong">Bist du krank?</span>
          <span className="meta">Deine Anzeichen werden seit {shortDate(new Date(ask.since + "T12:00:00"))} stärker.</span>
          <div className="pills wrap">
            <button type="button" className="btn btn-dark" disabled={busy} onClick={enter}>
              {ill.label} ab {shortDate(new Date(ask.since + "T12:00:00"))} eintragen
            </button>
            <Link href="/gesundheit?t=krank" className="btn btn-soft">Etwas anderes</Link>
          </div>
        </div>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
      <span className="meta">Bitte ärztlich abklären: Fieber über mehrere Tage, Atemnot oder Brustschmerz.</span>
    </section>
  );
}
