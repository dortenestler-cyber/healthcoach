"use client";

import { useEffect, useState } from "react";
import { Row, Toggle } from "@/components/SettingsView";
import { currentSubscription, disablePush, enablePush, loadReminder, pushSupport, setReminder, testPush, type PushSupport } from "@/lib/push";

const TIMES = ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"];

// Mitteilungen auf diesem Gerät: Erinnerung an den Morgen-Check-in
export default function PushRows() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [time, setTime] = useState("07:30");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSupport(pushSupport());
    currentSubscription().then(async (s) => {
      setSub(s);
      const r = s ? await loadReminder(s) : null;
      if (r) setTime(r.remind_at);
    });
  }, []);

  const run = async (job: () => Promise<string | void>) => {
    setBusy(true);
    setMsg("");
    try {
      const m = await job();
      if (m) setMsg(m);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setSub(await currentSubscription());
    setBusy(false);
  };

  if (support === "homescreen") {
    return <Row label="Mitteilungen" note="Nur möglich, wenn Health Coach auf dem Home-Bildschirm liegt: in Safari Teilen › Zum Home-Bildschirm." />;
  }
  if (support === "none") return <Row label="Mitteilungen" note="Auf diesem Gerät nicht verfügbar." />;

  return (
    <>
      <Toggle
        label="Erinnerung an den Check-in"
        note={sub ? `Jeden Morgen um ${time} Uhr, wenn der Check-in noch fehlt` : "Mitteilung am Morgen, nur auf diesem Gerät"}
        on={!!sub}
        disabled={busy || support === null}
        onChange={() => run(() => (sub ? disablePush() : enablePush(time)))}
      />
      {sub && (
        <div className="settings-row">
          <label htmlFor="remind-at" className="row-label">Uhrzeit</label>
          <select
            id="remind-at"
            className="input settings-select"
            value={time}
            disabled={busy}
            onChange={(e) => {
              const t = e.target.value;
              setTime(t);
              run(() => setReminder(sub, { remind_at: t }));
            }}
          >
            {(TIMES.includes(time) ? TIMES : [...TIMES, time]).map((t) => (
              <option key={t} value={t}>
                {t} Uhr
              </option>
            ))}
          </select>
        </div>
      )}
      {sub && <Row label="Testmitteilung senden" onClick={busy ? undefined : () => run(async () => { await testPush(); return "Gesendet. Sie sollte gleich erscheinen."; })} />}
      {msg && <p className="settings-note" role="status">{msg}</p>}
    </>
  );
}
