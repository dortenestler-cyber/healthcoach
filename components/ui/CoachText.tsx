"use client";

import type { ReactNode } from "react";

// Text vom Coach: erste Zeile als Satz zur Lage, Zeilen mit „- “ als Liste, **fett** erlaubt.
function inline(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
}

export default function CoachText({ text }: { text: string }) {
  const zeilen = text.split("\n").map((z) => z.trim()).filter(Boolean);
  const blöcke: ReactNode[] = [];
  let liste: string[] = [];
  const flush = () => {
    if (liste.length) blöcke.push(<ul key={"l" + blöcke.length} className="coach-text-liste">{liste.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    liste = [];
  };
  for (const z of zeilen) {
    if (/^[-•]\s+/.test(z)) liste.push(z.replace(/^[-•]\s+/, ""));
    else {
      flush();
      blöcke.push(<p key={"p" + blöcke.length} className={blöcke.length === 0 ? "coach-text-lage" : "coach-text-p"}>{inline(z)}</p>);
    }
  }
  flush();
  return <div className="coach-text">{blöcke}</div>;
}
