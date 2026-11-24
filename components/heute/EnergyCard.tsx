import Link from "next/link";
import EnergyChart from "@/components/heute/EnergyChart";
import type { Data } from "@/lib/insights";
import { energyDay, usualRhythm } from "@/lib/energie";

// Energie über den Tag: Satz, aktuelle Body Battery, Diagramm. Ohne Netzwerk.
export default function EnergyCard({ day, data, nowMinute, hideValue = false }: { day: string; data: Data; nowMinute: number; hideValue?: boolean }) {
  const e = energyDay(day, data.daily, data.acts, nowMinute);
  const hasCurves = data.daily.some((d) => Array.isArray(d.bb_curve));
  const lastIdx = [...e.today.keys()].reverse().find((i) => e.today[i] !== null);
  const now = lastIdx !== undefined ? (e.today[lastIdx] as number) : null;
  const usualNow = lastIdx !== undefined ? e.usual[lastIdx] : null;
  const at22 = e.projection[88]; // 22:00

  let sentence = "Der Tagesverlauf erscheint nach dem nächsten Synchronisieren.";
  if (hasCurves && now === null) sentence = "Für heute gibt es noch keine Body-Battery-Werte.";
  else if (now !== null && usualNow === null) sentence = `Deine Body Battery liegt gerade bei ${now}. Dein üblicher Tag entsteht ab 7 Tagen Verlauf.`;
  else if (now !== null && usualNow !== null) {
    const d = Math.round(now - usualNow);
    sentence = Math.abs(d) < 5 ? "Deine Energie verläuft heute wie an einem üblichen Tag." : `Deine Energie liegt gerade ${Math.abs(d)} Punkte ${d > 0 ? "über" : "unter"} deinem üblichen Tag.`;
    if (at22 !== null) sentence += ` Hochgerechnet bist du um 22 Uhr bei etwa ${Math.round(at22)}.`;
  }

  const rhythm = usualRhythm(e.usual);

  return (
    <Link href="/wert/bb" className="card chart-card">
      <span className="eyebrow">Energie über den Tag · Body Battery ›</span>
      <h2>{sentence}</h2>
      {!hideValue && <p className="value-big">{now ?? "–"}</p>}
      <p className="value-range">{usualNow !== null ? `Üblich um diese Zeit: ${Math.round(usualNow)} · aus ${e.usualDays} Tagen` : "Dein üblicher Tag: Median der letzten 30 Tage"}</p>
      {hasCurves && <EnergyChart e={e} label={`Body Battery heute${now !== null ? `, jetzt ${now}` : ""}${usualNow !== null ? `, üblich ${Math.round(usualNow)}` : ""}${at22 !== null ? `, um 22 Uhr etwa ${Math.round(at22)}` : ""}`} />}
      {rhythm && (
        <p className="rhythm-line">
          Am meisten Energie hast du meist zwischen <strong>{rhythm.peak[0]} und {rhythm.peak[1]} Uhr</strong>
          {rhythm.drain ? <>, am stärksten sinkt sie zwischen <strong>{rhythm.drain[0]} und {rhythm.drain[1]} Uhr</strong></> : null}.
        </p>
      )}
      <span className="meta">Die Hochrechnung folgt deinem üblichen Verlauf ab jetzt. Ein Richtwert, keine Vorhersage.</span>
    </Link>
  );
}
