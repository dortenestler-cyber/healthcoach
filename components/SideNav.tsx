"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearPin } from "@/lib/pin";
import { tabs } from "@/components/TabBar";
import { useHealthBadge } from "@/lib/navBadges";
import { syncState } from "@/components/heute/DayHead";
import { syncGarmin } from "@/lib/garmin";
import { announceNewData, REFRESH_EVENT } from "@/lib/refresh";

// Seitenleiste ab 768 px (Konzept Web-App): App-Symbol, Navigation, unten Einstellungen, Garmin-Stand und Abmelden.
// 768–1199 px nur Symbole, ab 1200 px mit Namen.
export default function SideNav() {
  const pathname = usePathname();
  const health = useHealthBadge();
  const [lastSync, setLastSync] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sb = supabase();
    const load = () =>
      sb
        ?.from("garmin_daily")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setLastSync(data?.synced_at ? new Date(data.synced_at as string).getTime() : 0));
    load();
    const t = setInterval(() => {
      setNow(Date.now());
      load();
    }, 5 * 60000);
    const onNew = () => {
      setNow(Date.now());
      load();
    };
    window.addEventListener(REFRESH_EVENT, onNew);
    return () => {
      clearInterval(t);
      window.removeEventListener(REFRESH_EVENT, onNew);
    };
  }, [pathname]);

  const sync = syncState(lastSync, failed, now);
  // Aktualisieren (Konzept Datenaktualisierung A8): kurzer Garmin-Abruf, danach laden alle Seiten neu
  const refresh = async () => {
    setBusy(true);
    const res = await syncGarmin(1);
    setBusy(false);
    setFailed(!res.ok);
    announceNewData();
  };
  const signOut = async () => {
    clearPin();
    await supabase()?.auth.signOut();
  };
  const settingsActive = pathname.startsWith("/einstellungen");

  return (
    <nav className="sidenav" aria-label="Hauptnavigation">
      <Link href="/" className="sidenav-brand">
        <img src="/icons/icon.svg" alt="" width={34} height={34} />
        <span className="sidenav-label">Health Coach</span>
      </Link>
      {tabs.map((t) => {
        const active = t.href === "/" ? pathname === "/" || pathname.startsWith("/heute") : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="sidenav-item" aria-current={active ? "page" : undefined} title={t.label}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              {t.href === "/gesundheit" && health > 0 && (
                <span className="nav-badge" aria-hidden="true">
                  {health}
                </span>
              )}
            </span>
            <span className="sidenav-label">{t.label}</span>
            {t.href === "/gesundheit" && health > 0 && <span className="sr-only">, {health} neu</span>}
          </Link>
        );
      })}
      <div className="sidenav-grow" />
      <Link href="/einstellungen" className="sidenav-item" aria-current={settingsActive ? "page" : undefined} title="Einstellungen">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        </svg>
        <span className="sidenav-label">Einstellungen</span>
      </Link>
      <button type="button" className="sidenav-sync sidenav-refresh" title={`${sync.text} · Tippen zum Aktualisieren`} onClick={refresh} disabled={busy} aria-busy={busy}>
        <span className="sidenav-dot" data-level={sync.level} aria-hidden="true" />
        <span className="sidenav-label" aria-hidden="true">
          {busy ? "Garmin · lädt …" : lastSync ? `Garmin · Stand ${new Date(lastSync).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : "Garmin · keine Daten"}
          {!busy && <span className="sidenav-refresh-word"> · Aktualisieren</span>}
        </span>
        <span className="sr-only">{sync.text}. Aktualisieren</span>
      </button>
      <button type="button" className="sidenav-item sidenav-out" onClick={signOut} title="Abmelden">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
        </svg>
        <span className="sidenav-label">Abmelden</span>
      </button>
    </nav>
  );
}
