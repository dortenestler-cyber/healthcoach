"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { clearPin, LOCK_AFTER_MS } from "@/lib/pin";
import { disableFaceId, enableFaceId, faceIdAvailable, faceIdOn } from "@/lib/faceid";
import {
  COACH_LIMITS,
  currentProfile,
  PROFILES,
  setCoachPrefs,
  setTheme,
  THEME_LABEL,
  useCoachPrefs,
  useFeatures,
  useTheme,
  type Theme,
} from "@/lib/prefs";
import { startOfToday } from "@/lib/dates";
import PageHead from "@/components/PageHead";

// Einstellungen, gruppiert: Schutz, Coach & Mitteilungen, Aussehen, Daten, Hilfe.
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
    disableFaceId();
    await supabase()?.auth.signOut();
  };

  const features = useFeatures();
  const profile = currentProfile(features);

  return (
    <>
      <PageHead title="Einstellungen" sub={email ? `Angemeldet als ${email}` : "Health Coach"} gear={false} />

      <Group title="Schutz">
        <FaceIdRow />
        <Row label="PIN ändern" note="Du legst danach eine neue PIN fest." onClick={changePin} />
        <Row label="Automatische Sperre" value={`nach ${Math.round(LOCK_AFTER_MS / 60000)} Min. im Hintergrund`} />
        <Row label="Abmelden" note="PIN und Face ID auf diesem Gerät werden dabei gelöscht." onClick={signOut} />
      </Group>

      <CoachGroup />

      <Group title="Aussehen">
        <ThemeRow />
        <Row
          label="Funktionen"
          note="Bereiche ein- und ausblenden"
          value={profile ? PROFILES.find((p) => p.key === profile)?.label : "Eigene Auswahl"}
          href="/einstellungen/funktionen"
        />
      </Group>

      <Group title="Daten">
        <Row label="Export & Backup" note="Sicherung als JSON, Tabellen als CSV, Wiederherstellen" href="/einstellungen/daten" />
        <Row label="Einrichtungs-Check" note="Garmin, Coach und letzter Abruf" href="/einstellungen/check" />
        <Row label="Nutzung" note="Welche Bereiche du wie oft öffnest" href="/einstellungen/nutzung" />
        <Row label="Uhr verbinden" note="Schlüssel für die Fenix anlegen oder löschen." href="/uhr" />
        <Row label="Verlauf" note="HRV, Schlaf und weitere Werte über die Zeit." href="/verlauf" />
      </Group>

      <Group title="Hilfe">
        <Row label="Begriffe" note="HRV, Body Battery, Ruhepuls und mehr, kurz erklärt" href="/begriffe" />
        <p className="settings-note">
          Health Coach stellt keine Diagnosen und schlägt keine Dosierungen vor. Bei Warnzeichen bitte ärztlich abklären lassen.
        </p>
      </Group>
    </>
  );
}

function FaceIdRow() {
  const [avail, setAvail] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setOn(faceIdOn());
    faceIdAvailable().then(setAvail);
  }, []);

  const toggle = async () => {
    setMsg("");
    if (on) {
      disableFaceId();
      setOn(false);
      return;
    }
    const err = await enableFaceId();
    if (err) setMsg(err);
    else setOn(true);
  };

  if (avail === false) {
    return <Row label="Face ID" note="Auf diesem Gerät nicht verfügbar. Die PIN schützt die App." />;
  }
  return (
    <>
      <Toggle label="Face ID" note="Entsperren mit Face ID, die PIN bleibt als Rückfall." on={on} disabled={avail === null} onChange={toggle} />
      {msg && <p className="settings-note" role="status">{msg}</p>}
    </>
  );
}

function ThemeRow() {
  const theme = useTheme();
  return (
    <div className="settings-row">
      <span className="row-label">Darstellung</span>
      <div className="pills" role="radiogroup" aria-label="Darstellung">
        {(Object.keys(THEME_LABEL) as Theme[]).map((t) => (
          <button key={t} type="button" role="radio" className="pill pill-sm" aria-checked={theme === t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
            {THEME_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoachGroup() {
  const prefs = useCoachPrefs();
  const [today, setToday] = useState<number | null>(null);
  const [month, setMonth] = useState<{ cost: number; answers: number } | null>(null);
  const [costNote, setCostNote] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    sb.from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", startOfToday().toISOString())
      .then(({ count }) => setToday(count ?? 0));
    sb.from("coach_messages")
      .select("cost_usd")
      .eq("role", "assistant")
      .gte("created_at", monthStart.toISOString())
      .then(({ data, error }) => {
        if (error) {
          setCostNote("Kosten werden erst nach der Datenbank-Ergänzung „coach_kosten“ erfasst.");
          return;
        }
        const rows = (data ?? []) as { cost_usd: number | null }[];
        setMonth({ cost: rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0), answers: rows.length });
        if (rows.some((r) => r.cost_usd === null)) setCostNote("Ältere Antworten ohne Kostenangabe zählen nicht mit.");
      });
  }, []);

  const usd = (v: number) => v.toLocaleString("de-DE", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Group title="Coach & Mitteilungen">
      <Toggle label="Coach" note={prefs.on ? "Fragen gehen an Claude." : "Aus: keine Fragen, keine Kosten."} on={prefs.on} onChange={() => setCoachPrefs({ on: !prefs.on })} />
      {prefs.on && (
        <div className="settings-row">
          <span className="stack">
            <span className="row-label">Fragen pro Tag</span>
            <span className="meta">{today === null ? "…" : `Heute ${today} von ${prefs.dailyLimit}`}</span>
          </span>
          <div className="pills" role="radiogroup" aria-label="Fragen pro Tag">
            {COACH_LIMITS.map((n) => (
              <button key={n} type="button" role="radio" className="pill pill-sm" aria-checked={prefs.dailyLimit === n} aria-pressed={prefs.dailyLimit === n} onClick={() => setCoachPrefs({ dailyLimit: n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <Row
        label="Kosten diesen Monat"
        note={costNote || (month ? `${month.answers} ${month.answers === 1 ? "Antwort" : "Antworten"}, Preise laut Anthropic` : undefined)}
        value={month ? usd(month.cost) : "…"}
      />
      <Row label="Hinweise des Coachs" note="Alle Antworten, auch bereits gesehene" href="/coach/hinweise" />
      {prefs.on && <Row label="Coach öffnen" href="/coach" />}
    </Group>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-label={title}>
      <h2 className="settings-title">{title}</h2>
      <div className="card settings-card">{children}</div>
    </section>
  );
}

export function Toggle({ label, note, on, disabled, onChange }: { label: string; note?: string; on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button type="button" className="settings-row" role="switch" aria-checked={on} disabled={disabled} onClick={onChange}>
      <span className="stack">
        <span className="row-label">{label}</span>
        {note && <span className="meta">{note}</span>}
      </span>
      <span className="switch" data-on={on} aria-hidden="true">
        <span className="switch-knob" />
      </span>
      <span className="sr-only">{on ? "an" : "aus"}</span>
    </button>
  );
}

export function Row({ label, value, note, href, onClick }: { label: string; value?: string; note?: string; href?: string; onClick?: () => void }) {
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
