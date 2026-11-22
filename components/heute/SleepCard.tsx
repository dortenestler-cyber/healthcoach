import Link from "next/link";
import { DayBars, SleepStagesBar, ValueHeader } from "@/components/charts";
import { metricBaseline } from "@/lib/baseline";
import { daysAgo, isoDay } from "@/lib/dates";
import type { Data } from "@/lib/insights";
import { hm, sleepNeed } from "@/lib/today";

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const hShort = (v: number) => {
  const t = Math.round(v * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// Ansicht in der Karte „Deine Werte“ auf Heute (ohne eigenen Kartenrahmen).
// Schlaf: Phasen der letzten Nacht, 7 Nächte mit deinem Bereich und dem Bedarf, Nachtschweiß aus dem Tagebuch markiert
export default function SleepCard({ data }: { data: Data }) {
  const today = isoDay();
  const byDay = new Map(data.daily.map((r) => [r.day, r]));
  const sweat = new Set(data.diary.filter((d) => (d.symptoms?.nacht ?? 0) > 0).map((d) => d.day));
  const days = Array.from({ length: 7 }, (_, i) => isoDay(daysAgo(6 - i)));
  const hours = (d: string) => {
    const s = byDay.get(d)?.sleep_seconds;
    return s ? s / 3600 : null;
  };
  const need = sleepNeed(isoDay(daysAgo(1)), data.daily, data.acts); // Bedarf, der für letzte Nacht galt
  const base = metricBaseline("schlaf", data.daily, { diary: data.diary, sick: data.sick }, today);
  const last = byDay.get(today);
  const lastH = hours(today);
  const stages = last && (last.sleep_deep_s || last.sleep_rem_s || last.sleep_light_s)
    ? { tief: (last.sleep_deep_s ?? 0) / 60, rem: (last.sleep_rem_s ?? 0) / 60, leicht: (last.sleep_light_s ?? 0) / 60, wach: (last.sleep_awake_s ?? 0) / 60 }
    : null;

  const below = days.filter((d) => {
    const h = hours(d);
    return h !== null && h < need.hours;
  }).length;
  const sweatNights = days.filter((d) => sweat.has(d)).length;
  const withValue = days.filter((d) => hours(d) !== null).length;
  const sentence = !withValue
    ? "Noch keine Schlafwerte in den letzten 7 Nächten."
    : `${below === 0 ? "Keine Nacht" : below === 1 ? "Eine Nacht" : `${below} Nächte`} unter deinem Bedarf${sweatNights ? `, ${sweatNights === 1 ? "eine" : sweatNights} mit Nachtschweiß` : ""}.`;

  return (
    <div className="values-pane">
      <ValueHeader meta="Schlaf · letzte Nacht" sentence={sentence} value={lastH === null ? null : hm(lastH)} fmt={hShort} range={base.range}>
        {stages ? (
          <SleepStagesBar minutes={stages} />
        ) : (
          <span className="meta">Schlafphasen erscheinen nach dem nächsten Synchronisieren.</span>
        )}
        <DayBars
          tone="sleep"
          fmt={hShort}
          label={`Schlaf der letzten 7 Nächte: ${days.map((d) => `${WD[new Date(d + "T12:00:00").getDay()]} ${hours(d) === null ? "kein Wert" : hm(hours(d) as number)}`).join(", ")}`}
          band={base.range}
          target={need.hours}
          targetLabel={`Bedarf ${hShort(need.hours)}`}
          markerLabel="Nachtschweiß eingetragen"
          bars={days.map((d) => ({ label: WD[new Date(d + "T12:00:00").getDay()], value: hours(d), today: d === today, marker: sweat.has(d) }))}
        />
      </ValueHeader>
      <Link href="/verlauf?m=schlaf" className="settings-link">Schlaf im Verlauf ›</Link>
    </div>
  );
}
