// Kästchen-Raster (Konzept docs/konzept-buendeln.md, Baustein 6): ein Feld je Tag, eine Spalte je Woche (Montag oben),
// Monatsnamen darüber, Legende darunter. Genutzt für Trainingstage und Gewohnheiten.
// tone: „training“ (Slate-Blau) oder „neutral“ (Gewohnheiten). Kommende Tage bleiben leer.

const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function Raster({ today, weeks, on, tone = "training", label, keyOff, keyOn }: { today: string; weeks: number; on: (day: string) => boolean; tone?: "training" | "neutral"; label: string; keyOff: string; keyOn: string }) {
  const mon = addDays(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
  const start = addDays(mon, -7 * (weeks - 1));
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const marks = Array.from({ length: weeks }, (_, w) => ({ w, m: Number(addDays(start, w * 7).slice(5, 7)) - 1 })).filter((x, i, all) => i === 0 || x.m !== all[i - 1].m);
  const onClass = tone === "training" ? "habit-on" : "habit-on-neutral";
  return (
    <>
      <div className="habit-months" aria-hidden="true">
        {marks.map((x) => (
          <span key={x.w} style={{ left: `${(x.w / weeks) * 100}%` }}>{MON[x.m]}</span>
        ))}
      </div>
      <div className="habit-grid" style={{ aspectRatio: `${weeks} / 7` }} role="img" aria-label={label}>
        {days.map((d) => (
          <span key={d} className={d > today ? "habit-cell habit-future" : on(d) ? `habit-cell ${onClass}` : "habit-cell"} />
        ))}
      </div>
      <div className="legend habit-legend">
        <span><i className="habit-key-off" />{keyOff}</span>
        <span><i className={tone === "training" ? "habit-key-on" : "habit-key-neutral"} />{keyOn}</span>
      </div>
    </>
  );
}
