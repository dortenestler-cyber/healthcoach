"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { clearPin, LOCK_AFTER_MS } from "@/lib/pin";
import PageHead from "@/components/PageHead";

// Einstellungen, gruppiert: Schutz, Coach & Mitteilungen, Aussehen, Daten, Hilfe.
// Weitere Schalter (Face ID, Darstellung, Coach-Limit …) kommen schrittweise aus dem Backlog dazu.
export default function SettingsView() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase()?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const changePin = () => {
    clearPin();
    window.location.href = "/";
  };

  const signOut = async () => {
    clearPin();
    await supabase()?.auth.signOut();
  };

  return (
    <>
      <PageHead title="Einstellungen" sub={email ? `Angemeldet als ${email}` : "Health Coach"} gear={false} />

      <Group title="Schutz">
        <Row label="PIN ändern" note="Du legst danach eine neue PIN fest." onClick={changePin} />
        <Row label="Automatische Sperre" value={`nach ${Math.round(LOCK_AFTER_MS / 60000)} Min. im Hintergrund`} />
        <Row label="Abmelden" note="Die PIN auf diesem Gerät wird dabei gelöscht." onClick={signOut} />
      </Group>

      <Group title="Coach & Mitteilungen">
        <Row label="Coach öffnen" href="/coach" />
      </Group>

      <Group title="Aussehen">
        <Row label="Darstellung" value="Hell" />
      </Group>

      <Group title="Daten">
        <Row label="Uhr verbinden" note="Schlüssel für die Fenix anlegen oder löschen." href="/uhr" />
        <Row label="Verlauf" note="HRV, Schlaf und weitere Werte über die Zeit." href="/verlauf" />
      </Group>

      <Group title="Hilfe">
        <p className="settings-note">
          Health Coach stellt keine Diagnosen und schlägt keine Dosierungen vor. Bei Warnzeichen bitte ärztlich abklären lassen.
        </p>
      </Group>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-label={title}>
      <h2 className="settings-title">{title}</h2>
      <div className="card settings-card">{children}</div>
    </section>
  );
}

function Row({ label, value, note, href, onClick }: { label: string; value?: string; note?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="stack">
        <span className="row-label">{label}</span>
        {note && <span className="meta">{note}</span>}
      </span>
      {value && <span className="meta settings-value">{value}</span>}
      {(href || onClick) && <span className="settings-chevron" aria-hidden="true">›</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="settings-row">
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="settings-row" onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className="settings-row">{body}</div>;
}
