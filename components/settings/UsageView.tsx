"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import { Group, Row } from "@/components/SettingsView";
import { clearUsage, getUsage, type Usage } from "@/lib/prefs";

const NAMES: Record<string, string> = {
  "/": "Heute",
  "/tagebuch": "Tagebuch",
  "/training": "Training",
  "/zyklus": "Zyklus",
  "/gesundheit": "Gesundheit",
  "/coach": "Coach",
  "/coach/hinweise": "Hinweise des Coachs",
  "/verlauf": "Verlauf",
  "/tagesziel": "Tagesziel",
  "/uhr": "Uhr verbinden",
  "/begriffe": "Begriffe",
  "/einstellungen": "Einstellungen",
  "/einstellungen/funktionen": "Funktionen",
  "/einstellungen/daten": "Export & Backup",
  "/einstellungen/check": "Einrichtungs-Check",
  "/einstellungen/nutzung": "Nutzung",
};

// Nutzungsauswertung als Grundlage für „eins rein, eins raus“
export default function UsageView() {
  const [usage, setUsage] = useState<Usage>({});
  useEffect(() => setUsage(getUsage()), []);

  const rows = Object.entries(usage).sort((a, b) => b[1].n - a[1].n);
  const max = Math.max(1, ...rows.map(([, v]) => v.n));
  const total = rows.reduce((s, [, v]) => s + v.n, 0);
  const never = Object.keys(NAMES).filter((k) => !usage[k]);

  return (
    <>
      <PageHead title="Nutzung" sub={total ? `${total} Aufrufe auf diesem Gerät` : "Noch keine Aufrufe gezählt"} />
      <Group title={rows[0] ? `Am häufigsten: ${NAMES[rows[0][0]] ?? rows[0][0]}` : "Bereiche"}>
        {rows.map(([k, v]) => (
          <div key={k} className="settings-row">
            <span className="stack">
              <span className="row-label">{NAMES[k] ?? k}</span>
              <span className="usage-bar" aria-hidden="true">
                <span style={{ width: (v.n / max) * 100 + "%" }} />
              </span>
              <span className="meta">Zuletzt {new Date(v.last).toLocaleDateString("de-DE")}</span>
            </span>
            <span className="row-strong">{v.n}</span>
          </div>
        ))}
        {!rows.length && <p className="settings-note">Sobald du die App nutzt, erscheinen hier die Bereiche.</p>}
      </Group>
      {never.length > 0 && (
        <Group title="Noch nie geöffnet">
          <p className="settings-note">{never.map((k) => NAMES[k]).join(", ")}</p>
        </Group>
      )}
      <Group title="Zurücksetzen">
        <Row
          label="Zähler löschen"
          note="Gezählt wird nur auf diesem Gerät, ohne Inhalte."
          onClick={() => {
            if (window.confirm("Alle Zähler löschen?")) {
              clearUsage();
              setUsage({});
            }
          }}
        />
      </Group>
    </>
  );
}
