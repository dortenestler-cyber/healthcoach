"use client";

import { useRef, useState, type ChangeEvent } from "react";
import PageHead from "@/components/PageHead";
import { Group, Row } from "@/components/SettingsView";
import { download, makeBackup, restoreBackup, TABLES, tableCsv, type Backup } from "@/lib/backup";
import { isoDay } from "@/lib/dates";

// Export & Backup: alle eigenen Daten sichern, einzelne Tabellen als CSV, Sicherung wiederherstellen
export default function DataView() {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [table, setTable] = useState(TABLES[1].name);
  const file = useRef<HTMLInputElement>(null);

  const run = async (label: string, job: () => Promise<string>) => {
    setBusy(label);
    setMsg("");
    try {
      setMsg(await job());
    } catch (e) {
      setMsg("Das hat nicht geklappt: " + (e instanceof Error ? e.message : String(e)));
    }
    setBusy("");
  };

  const backup = () =>
    run("Sicherung", async () => {
      const b = await makeBackup((l) => setBusy("Sicherung: " + l));
      const n = Object.values(b.tables).reduce((s, r) => s + r.length, 0);
      download(`health-coach-sicherung-${isoDay()}.json`, JSON.stringify(b), "application/json");
      return `Sicherung mit ${n} Einträgen erstellt. Bewahre die Datei sicher auf, sie enthält Gesundheitsdaten.`;
    });

  const csv = () =>
    run("CSV", async () => {
      const t = TABLES.find((x) => x.name === table)!;
      const { csv: text, count } = await tableCsv(t.name);
      download(`health-coach-${t.name}-${isoDay()}.csv`, text, "text/csv;charset=utf-8");
      return `${t.label}: ${count} Zeilen als CSV gespeichert.`;
    });

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    let b: Backup;
    try {
      b = JSON.parse(await f.text());
    } catch {
      setMsg("Die Datei ist keine gültige Sicherung.");
      return;
    }
    const n = Object.values(b?.tables ?? {}).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0);
    const when = b?.created_at ? new Date(b.created_at).toLocaleString("de-DE") : "unbekannt";
    if (!window.confirm(`Sicherung vom ${when} mit ${n} Einträgen einspielen? Einträge mit gleichem Tag oder gleicher Kennung werden überschrieben, nichts wird gelöscht.`)) return;
    run("Wiederherstellen", async () => {
      const total = await restoreBackup(b, (l) => setBusy("Wiederherstellen: " + l));
      return `${total} Einträge wiederhergestellt.`;
    });
  };

  return (
    <>
      <PageHead title="Export & Backup" />
      <Group title="Sicherung">
        <Row label="Sicherung herunterladen" note="Alle deine Daten als eine JSON-Datei" onClick={busy ? undefined : backup} />
        <Row label="Sicherung wiederherstellen" note="JSON-Datei auswählen" onClick={busy ? undefined : () => file.current?.click()} />
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={restore} />
        <p className="settings-note">Die Schlüssel der Uhr sind nicht in der Sicherung. Nach dem Wiederherstellen legst du sie unter „Uhr verbinden“ neu an.</p>
      </Group>
      <Group title="Tabelle als CSV">
        <div className="settings-row">
          <label htmlFor="csv-table" className="row-label">Bereich</label>
          <select id="csv-table" className="input settings-select" value={table} onChange={(e) => setTable(e.target.value)}>
            {TABLES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Row label="CSV herunterladen" note="Mit Semikolon getrennt, öffnet direkt in Numbers und Excel" onClick={busy ? undefined : csv} />
      </Group>
      {(busy || msg) && (
        <p className="settings-note" role="status">
          {busy ? busy + " …" : msg}
        </p>
      )}
    </>
  );
}
