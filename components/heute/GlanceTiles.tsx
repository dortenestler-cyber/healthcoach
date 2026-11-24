import Link from "next/link";
import { countInRange, positionIn } from "@/lib/baseline";
import { bereichSeit, bereichWort } from "@/lib/einordnung";
import type { Data } from "@/lib/insights";
import { hm, offStreaks, sleepNeed, vitalRows } from "@/lib/today";

type Tile = { key: string; label: string; value: string; unit?: string; word: string; alert?: boolean; href: string; icon: string };

const ICON = {
  hrv: "M3 12h4l2-5 3 10 2-5h7",
  puls: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z",
  mond: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
};

// „Auf einen Blick“ (nach Sonar): Kacheln mit Symbol, Name, Zahl und einem Wort zur Einordnung.
// HRV und Ruhepuls gegen deinen Bereich, Schlafbedarf für heute Nacht. Der Zyklus steht als Ring in der Ringreihe.
// Liegt ein Wert seit Tagen außerhalb, steht das Wort in Amber, ab 5 Tagen Ruhepuls der Hinweis auf ärztliche Abklärung.
export default function GlanceTiles({ day, data, showGarmin }: { day: string; data: Data; showGarmin: boolean }) {
  const tiles: Tile[] = [];
  const rows = showGarmin ? vitalRows(day, data).filter((r) => r.key === "hrv" || r.key === "ruhepuls") : [];
  const streaks = showGarmin ? offStreaks(day, data) : [];

  for (const r of rows) {
    const st = streaks.find((s) => s.key === r.key);
    const pos = r.value !== null && r.base.active ? positionIn(r.value, r.base.active) : null;
    const word = st ? bereichSeit(st.side, st.days) : pos === null ? (r.value === null ? "kein Wert" : "Bereich ab 14 Tagen") : bereichWort(pos);
    const [num, ...unit] = r.value === null ? ["–"] : r.fmt(r.value).split(" ");
    tiles.push({ key: r.key, label: r.key === "hrv" ? "HRV" : "Ruhepuls", value: num, unit: unit.join(" "), word, alert: !!st, href: r.href ?? `/verlauf?m=${r.key}`, icon: r.key === "hrv" ? ICON.hrv : ICON.puls });
  }

  const need = sleepNeed(day, data.daily, data.acts);
  tiles.push({ key: "schlafbedarf", label: "Schlafbedarf", value: hm(need.hours), word: "heute Nacht", href: `/heute/schlaf?tag=${day}`, icon: ICON.mond });

  const count = countInRange(rows.map((r) => ({ value: r.value, range: r.base.active })));
  const longHigh = streaks.some((s) => s.key === "ruhepuls" && s.days >= 5);

  return (
    <section aria-label="Auf einen Blick">
      <div className="sec-head">
        <h2 className="sec-title">Auf einen Blick</h2>
        {count.total > 0 && (
          <span className="sec-note">
            {count.inRange} von {count.total} im Bereich
          </span>
        )}
      </div>
      <div className="today-glance">
        {tiles.map((t) => (
          <Link key={t.key} href={t.href} className="today-tile">
            <span className="today-tile-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
            </span>
            <span className="today-tile-text">
              <span className="today-tile-label">{t.label}</span>
              <span className="today-tile-value">
                {t.value}
                {t.unit ? <small> {t.unit}</small> : null}
              </span>
              <span className={"today-tile-word" + (t.alert ? " is-alert" : "")}>{t.word}</span>
            </span>
          </Link>
        ))}
      </div>
      {longHigh && <p className="meta today-glance-foot">Hält das an oder fühlst du dich krank, lass es ärztlich abklären.</p>}
    </section>
  );
}
