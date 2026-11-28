"use client";

import { useEffect, useState } from "react";
import { Row, Toggle } from "@/components/SettingsView";
import { currentSubscription, disablePush, enablePush, loadReminder, pushSupport, setReminder, testPush, type PushSupport, type Reminder } from "@/lib/push";

const TIMES = ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"];
const EVENING = ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"];

// Mitteilungen auf diesem Gerät: Tagesstart am Morgen, Zusammenfassung nach dem Training
export default function PushRows() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [time, setTime] = useState("07:30");
  const [rem, setRem] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSupport(pushSupport());
    currentSubscription().then(async (s) => {
      setSub(s);
      const r = s ? await loadReminder(s) : null;
      if (r) {
        setTime(r.remind_at);
        setRem(r);
      }
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
    const s = await currentSubscription();
    setSub(s);
    setRem(s ? await loadReminder(s) : null);
    setBusy(false);
  };
  const flip = (k: "checkin_reminder" | "training_push" | "show_values" | "evening_push" | "drink_push") => {
    if (!sub) return;
    const next = !(rem?.[k] ?? true);
    run(() => setReminder(sub, { [k]: next }));
  };

  if (support === "homescreen") {
    return <Row label="Mitteilungen" note="Nur möglich, wenn Health Coach auf dem Home-Bildschirm liegt: in Safari Teilen › Zum Home-Bildschirm." />;
  }
  if (support === "none") return <Row label="Mitteilungen" note="Auf diesem Gerät nicht verfügbar." />;

  return (
    <>
      <Toggle
        label="Mitteilungen"
        note="Nur auf diesem Gerät"
        on={!!sub}
        disabled={busy || support === null}
        onChange={() => run(() => (sub ? disablePush() : enablePush(time)))}
      />
      {sub && (
        <Toggle
          label="Tagesstart"
          note={`Jeden Morgen ab ${time} Uhr: Readiness und was heute ansteht`}
          on={rem?.checkin_reminder ?? true}
          disabled={busy}
          onChange={() => flip("checkin_reminder")}
        />
      )}
      {sub && (rem?.checkin_reminder ?? true) && (
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
      {sub && (
        <Toggle
          label="Tagesabschluss"
          note={`Jeden Abend ab ${rem?.evening_at ?? "21:00"} Uhr: Belastung, Schlafbedarf und was offen ist`}
          on={rem?.evening_push ?? true}
          disabled={busy}
          onChange={() => flip("evening_push")}
        />
      )}
      {sub && (rem?.evening_push ?? true) && (
        <div className="settings-row">
          <label htmlFor="evening-at" className="row-label">Uhrzeit</label>
          <select
            id="evening-at"
            className="input settings-select"
            value={rem?.evening_at ?? "21:00"}
            disabled={busy}
            onChange={(e) => {
              const t = e.target.value;
              run(() => setReminder(sub, { evening_at: t }));
            }}
          >
            {(EVENING.includes(rem?.evening_at ?? "21:00") ? EVENING : [...EVENING, rem?.evening_at ?? "21:00"]).map((t) => (
              <option key={t} value={t}>
                {t} Uhr
              </option>
            ))}
          </select>
        </div>
      )}
      {sub && (
        <Toggle
          label="Nach dem Training"
          note="Zusammenfassung, sobald die Einheit von Garmin da ist"
          on={rem?.training_push ?? true}
          disabled={busy}
          onChange={() => flip("training_push")}
        />
      )}
      {sub && (
        <Toggle
          label="Werte in Mitteilungen zeigen"
          note={(rem?.show_values ?? true) ? "Readiness und Trainingswerte stehen auf dem Sperrbildschirm" : "Auf dem Sperrbildschirm steht nur ein neutraler Satz"}
          on={rem?.show_values ?? true}
          disabled={busy}
          onChange={() => flip("show_values")}
        />
      )}
      {sub && (
        <Toggle
          label="Trinkerinnerung"
          note="Zwischen 8 und 20 Uhr, wenn 3 Stunden kein Getränk eingetragen ist"
          on={rem?.drink_push ?? true}
          disabled={busy}
          onChange={() => flip("drink_push")}
        />
      )}
      {sub && <Row label="Testmitteilung senden" onClick={busy ? undefined : () => run(async () => { await testPush(); return "Gesendet. Sie sollte gleich erscheinen."; })} />}
      {msg && <p className="settings-note" role="status">{msg}</p>}
    </>
  );
}
